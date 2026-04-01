import type { Socket } from 'socket.io';
import { getIO, userSockets } from '../index';
import { db } from '$lib/server/db';
import { tournaments, tournamentParticipants } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import {
	createTournament,
	joinTournament,
	leaveTournament,
	cancelTournament,
	startTournament,
	getActiveTournament,
} from '../../tournament/TournamentManager';

export function registerTournamentHandlers(socket: Socket) {
	const userId: number = socket.data.userId;
	const username: string = socket.data.username;

	// Create a tournament
	socket.on('tournament:create', async (data: {
		name: string;
		maxPlayers: number;  // 4, 8, or 16
		settings?: { speedPreset: string; winScore: number };
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
		const id = await createTournament(data.name.trim(), userId, data.maxPlayers, settings);

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

	// Leave spectator mode (after elimination or timeout, stop watching tournament)
	socket.on('tournament:leave-spectator', async (data: { tournamentId: number }) => {
		// Simply confirm — client will handle navigation away
		socket.emit('tournament:spectator-left', { tournamentId: data.tournamentId });

		// Optionally: track spectators to stop sending them updates (future optimization)
		console.log(`[Tournament] Player ${userId} left spectator mode for tournament ${data.tournamentId}`);
	});

	// Cancel a tournament (creator only, before it starts)
	socket.on('tournament:cancel', async (data: { tournamentId: number }) => {
		try {
			const result = await cancelTournament(data.tournamentId, userId);
			if (!result.success) {
				socket.emit('tournament:error', { message: 'Cannot cancel tournament' });
				return;
			}

			const io = getIO();

			// Notify each participant individually so they get the toast
			// even if they're on a different page
			for (const participantId of result.participantUserIds) {
				const participantSockets = userSockets.get(participantId);
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

	// Handle disconnect — graceful cleanup for both creator and participants
	socket.on('disconnect', async () => {
		try {
			// Check if this user was a tournament creator
			const [creatorTournament] = await db
				.select({ tournamentId: tournaments.id, status: tournaments.status })
				.from(tournaments)
				.where(eq(tournaments.created_by, userId))
				.limit(1);

			if (creatorTournament && creatorTournament.status === 'scheduled') {
				// Creator left BEFORE tournament started — cancel and cleanup
				const tournamentId = creatorTournament.tournamentId;
				
				// Get all participants before cleanup
				const participants = await db
					.select({ userId: tournamentParticipants.user_id })
					.from(tournamentParticipants)
					.where(eq(tournamentParticipants.tournament_id, tournamentId));

				// Mark tournament as cancelled
				await db
					.update(tournaments)
					.set({ status: 'cancelled' })
					.where(eq(tournaments.id, tournamentId));

				// Delete participants so cleanup can cascade (FK on delete cascade)
				await db
					.delete(tournamentParticipants)
					.where(eq(tournamentParticipants.tournament_id, tournamentId));

				// Notify each participant individually so they get the toast even if on different page
				const io = getIO();

				for (const participant of participants) {
					const participantSockets = userSockets.get(participant.userId);
					if (participantSockets) {
						for (const sid of participantSockets) {
							io.to(sid).emit('tournament:abandoned', {
								tournamentId,
								reason: 'Creator left - tournament cancelled',
							});
						}
					}
				}

				// Broadcast list update so tournaments page refreshes
				io.emit('tournament:list-updated');

				console.log(`[Tournament] Creator ${userId} left scheduled tournament ${tournamentId} - auto-cancelled`);
			} else if (creatorTournament && creatorTournament.status === 'in_progress') {
				// Creator disconnected during active tournament
				// Immediately forfeit them as normal participant (don't wait for reconnect timeout)
				// This allows tournament to continue and other players to advance
				const tournamentId = creatorTournament.tournamentId;
				console.log(`[Tournament] Creator ${userId} disconnected from active tournament ${tournamentId} - queuing forfeit`);
				
				// Queue the forfeit immediately instead of waiting for GameRoom timeout
				await leaveTournament(tournamentId, userId);
			}

			// Check if this user is a participant in any ACTIVE tournament (regardless of creator)
			// This handles non-creator participant disconnects in in_progress tournaments
			const [participantTournament] = await db
				.select({ tournamentId: tournaments.id })
				.from(tournaments)
				.innerJoin(tournamentParticipants, eq(tournaments.id, tournamentParticipants.tournament_id))
				.where(
					and(
						eq(tournamentParticipants.user_id, userId),
						eq(tournaments.status, 'in_progress'),
					),
				)
				.limit(1);

			if (participantTournament) {
				// Non-creator participant in active tournament — forfeit them
				// (If they were the creator, the above logic already handled them)
				const isCreatorOfThisTournament = creatorTournament?.tournamentId === participantTournament.tournamentId;
				
				if (!isCreatorOfThisTournament) {
					console.log(`[Tournament] Non-creator user ${userId} disconnected from active tournament ${participantTournament.tournamentId} - queuing forfeit`);
					await leaveTournament(participantTournament.tournamentId, userId);
				}
			}
		} catch (err) {
			// Silently fail on disconnect cleanup
			console.error('[Tournament] Disconnect cleanup failed:', err);
		}
	});
}