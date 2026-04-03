import type { Socket } from 'socket.io';
import { getIO, userSockets } from '../index';
import { db } from '$lib/server/db';
import { tournamentMessages, tournamentParticipants, users } from '$lib/server/db/schema';
import { eq, and, desc, lt } from 'drizzle-orm';
import {
	createTournament,
	joinTournament,
	leaveTournament,
	cancelTournament,
	startTournament,
	getActiveTournament,
	inviteToTournament,
	respondToInvite,
} from '../../tournament/TournamentManager';

export function registerTournamentHandlers(socket: Socket) {
	const userId: number = socket.data.userId;
	const username: string = socket.data.username;

	// Create a tournament
	socket.on('tournament:create', async (data: {
		name: string;
		maxPlayers: number;  // 4, 8, or 16
		settings?: { speedPreset: string; winScore: number };
		isPrivate?: boolean;
	}) => {
		if (!data.name?.trim()) {
			socket.emit('tournament:error', { message: 'Tournament name is required' });
			return;
		}
		if (![4, 8, 16].includes(data.maxPlayers)) {
			socket.emit('tournament:error', { message: 'Max players must be 4, 8, or 16' });
			return;
		}

		const settings = data.settings ?? { speedPreset: 'normal', winScore: 5 };
		const id = await createTournament(data.name.trim(), userId, data.maxPlayers, settings, data.isPrivate ?? false);

		// Auto-join the creator
		await joinTournament(id, userId);

		socket.emit('tournament:created', { tournamentId: id });

		// Broadcast to all clients so tournament list pages refresh
		const io = getIO();
		io.emit('tournament:list-updated');
	});

	// Join a tournament
	socket.on('tournament:join', async (data: { tournamentId: number }) => {
		const result = await joinTournament(data.tournamentId, userId);
		if (!result.success) {
			socket.emit('tournament:error', { message: result.error ?? 'Cannot join' });
			return;
		}
		socket.emit('tournament:joined', { tournamentId: data.tournamentId });

		// Notify all connected users viewing this tournament that someone joined
		const io = getIO();
		io.emit('tournament:player-joined', {
			tournamentId: data.tournamentId,
			userId,
			username,
		});
	});

	// Leave a tournament (before it starts)
	socket.on('tournament:leave', async (data: { tournamentId: number }) => {
		const success = await leaveTournament(data.tournamentId, userId);
		if (!success) {
			socket.emit('tournament:error', { message: 'Cannot leave tournament' });
			return;
		}
		socket.emit('tournament:left', { tournamentId: data.tournamentId });

		const io = getIO();
		io.emit('tournament:player-left', {
			tournamentId: data.tournamentId,
			userId,
			username,
		});
	});

	// Cancel a tournament (creator only, before it starts)
	socket.on('tournament:cancel', async (data: { tournamentId: number }) => {
		try {
			const result = await cancelTournament(data.tournamentId, userId);
			if (!result.success) {
				socket.emit('tournament:error', { message: 'Cannot cancel tournament' });
				return;
			}
			// Broadcast to all clients (including the creator)
			// Notify each participant individually so they get the toast
			// even if they're on a different page
			const io = getIO();
			console.log('[Tournament] Cancelled — notifying participants:', result.participantUserIds, 'userSockets keys:', [...userSockets.keys()]);
			for (const participantId of result.participantUserIds) {
				const participantSockets = userSockets.get(participantId);
				console.log(`[Tournament] Participant ${participantId} sockets:`, participantSockets ? [...participantSockets] : 'none');
				if (participantSockets) {
					for (const sid of participantSockets) {
						io.to(sid).emit('tournament:cancelled', {
							tournamentId: data.tournamentId,
							tournamentName: result.tournamentName,
						});
					}
				}
			}

			// Also broadcast list-updated so tournament list pages refresh
			io.emit('tournament:list-updated');
		} catch (err) {
			console.error('[Tournament] Cancel failed:', err);
			socket.emit('tournament:error', { message: 'Failed to cancel tournament' });
		}
	});

	// Start the tournament (creator only)
	socket.on('tournament:start', async (data: { tournamentId: number }) => {
		const bracket = await startTournament(data.tournamentId, userId);
		if (!bracket) {
			socket.emit('tournament:error', { message: 'Cannot start tournament (need at least 2 players)' });
			return;
		}
		// tournament:started is emitted to all participants inside startTournament()
	});

	// Get tournament bracket state
	socket.on('tournament:status', (data: { tournamentId: number }) => {
		const tourney = getActiveTournament(data.tournamentId);
		if (!tourney) {
			socket.emit('tournament:error', { message: 'Tournament not active' });
			return;
		}
		socket.emit('tournament:status', {
			tournamentId: data.tournamentId,
			bracket: tourney.bracket,
		});
	});

	// ── Invite a friend to a private tournament ───────────
	socket.on('tournament:invite', async (data: { tournamentId: number; userId: number }) => {
		const result = await inviteToTournament(data.tournamentId, userId, data.userId);
		if (!result.success) {
			socket.emit('tournament:error', { message: result.error ?? 'Cannot invite' });
			return;
		}
		socket.emit('tournament:invite-sent', {
			inviteId: result.inviteId,
			tournamentId: data.tournamentId,
			invitedUserId: data.userId,
		});
	});

	// ── Accept a tournament invite ────────────────────────
	socket.on('tournament:invite-accept', async (data: { inviteId: number }) => {
		const result = await respondToInvite(data.inviteId, userId, true);
		if (!result.success) {
			socket.emit('tournament:error', { message: result.error ?? 'Cannot accept' });
			return;
		}
		socket.emit('tournament:joined', { tournamentId: result.tournamentId });

		// Broadcast so lobby updates
		const io = getIO();
		io.emit('tournament:player-joined', {
			tournamentId: result.tournamentId,
			userId,
			username,
		});
	});

	// ── Decline a tournament invite ───────────────────────
	socket.on('tournament:invite-decline', async (data: { inviteId: number }) => {
		const result = await respondToInvite(data.inviteId, userId, false);
		if (!result.success) {
			socket.emit('tournament:error', { message: result.error ?? 'Cannot decline' });
			return;
		}
	});

	// ── Tournament Chat ───────────────────────────────────
	socket.on('tournament:chat-send', async (data: { tournamentId: number; content: string }) => {
		const { tournamentId, content } = data;

		// Validate content
		if (!content || content.trim().length === 0) return;
		if (content.length > 500) return;

		// Validate: user is a participant (current or past)
		const [participant] = await db
			.select()
			.from(tournamentParticipants)
			.where(
				and(
					eq(tournamentParticipants.tournament_id, tournamentId),
					eq(tournamentParticipants.user_id, userId),
				),
			);
		if (!participant) {
			socket.emit('tournament:error', { message: 'Only participants can chat' });
			return;
		}

		// Save to database
		const [msg] = await db.insert(tournamentMessages).values({
			tournament_id: tournamentId,
			user_id: userId,
			content: content.trim(),
			type: 'chat',
		}).returning();

		// Broadcast to all participants
		const payload = {
			id: msg.id,
			tournamentId,
			userId,
			username,
			avatarUrl: socket.data.avatarUrl ?? null,
			content: msg.content,
			type: 'chat',
			createdAt: msg.created_at instanceof Date ? msg.created_at.toISOString() : String(msg.created_at),
		};

		// Use getIO to broadcast to all participants
		const allParticipants = await db
			.select({ id: tournamentParticipants.user_id })
			.from(tournamentParticipants)
			.where(eq(tournamentParticipants.tournament_id, tournamentId));

		const io = getIO();
		for (const p of allParticipants) {
			const sockets = userSockets.get(p.id);
			if (sockets) {
				for (const sid of sockets) {
					io.to(sid).emit('tournament:chat-message', payload);
				}
			}
		}
	});

	// ── Load tournament chat history ──────────────────────
	socket.on('tournament:chat-history', async (data: { tournamentId: number; before?: number }, callback?: (result: any) => void) => {
		const { tournamentId, before } = data;

		const query = db
			.select({
				id: tournamentMessages.id,
				tournamentId: tournamentMessages.tournament_id,
				userId: tournamentMessages.user_id,
				username: users.username,
				avatarUrl: users.avatar_url,
				content: tournamentMessages.content,
				type: tournamentMessages.type,
				createdAt: tournamentMessages.created_at,
			})
			.from(tournamentMessages)
			.innerJoin(users, eq(users.id, tournamentMessages.user_id))
			.where(
				before
					? and(
						eq(tournamentMessages.tournament_id, tournamentId),
						lt(tournamentMessages.id, before),
					)
					: eq(tournamentMessages.tournament_id, tournamentId),
			)
			.orderBy(desc(tournamentMessages.id))
			.limit(50);

		const rows = await query;

		const messages = rows.reverse().map(r => ({
			id: r.id,
			tournamentId: r.tournamentId,
			userId: r.userId,
			username: r.username,
			avatarUrl: r.avatarUrl,
			content: r.content,
			type: r.type,
			createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
		}));

		const result = { messages, hasMore: rows.length === 50 };

		if (typeof callback === 'function') {
			callback(result);
		} else {
			socket.emit('tournament:chat-history', result);
		}
	});
}