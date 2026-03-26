import { db } from '$lib/server/db';
import { tournaments, tournamentParticipants } from '$lib/server/db/schema';
import { users } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { generateBracket, type BracketRound, type BracketPlayer } from './bracket';
import { createRoom, getRoom, destroyRoom } from '../socket/game/RoomManager';
import { getIO, userSockets } from '../socket/index';
import type { GameStateSnapshot } from '$lib/types/game';

// ── Active Tournament Storage ────────────────────────────
// tournamentId → tournament state
const activeTournaments = new Map<number, {
	id: number;
	bracket: BracketRound[];
	settings: { speedPreset: string; winScore: number };
	createdBy: number;
	playerMap: Map<number, string>; // userId → username
}>();

// ── Helpers ──────────────────────────────────────────────

/** Broadcast to all sockets of both players in a room */
function tournamentBroadcastState(roomId: string, state: GameStateSnapshot): void {
	const io = getIO();
	const room = getRoom(roomId);
	if (!room) return;
	for (const sid of room.player1.socketIds) io.to(sid).emit('game:state', state);
	for (const sid of room.player2.socketIds) io.to(sid).emit('game:state', state);
}

function tournamentBroadcastEvent(roomId: string, event: string, data: any): void {
	const io = getIO();
	const room = getRoom(roomId);
	if (!room) return;
	for (const sid of room.player1.socketIds) io.to(sid).emit(event, data);
	for (const sid of room.player2.socketIds) io.to(sid).emit(event, data);
}

/** Emit event to all participants of a tournament */
function emitToParticipants(tournamentId: number, event: string, data: any): void {
	const tourney = activeTournaments.get(tournamentId);
	if (!tourney) return;
	const io = getIO();
	for (const [userId] of tourney.playerMap) {
		const sockets = userSockets.get(userId);
		if (sockets) {
			for (const sid of sockets) io.to(sid).emit(event, data);
		}
	}
}

/** Emit event to a specific user */
function emitToUser(userId: number, event: string, data: any): void {
	const io = getIO();
	const sockets = userSockets.get(userId);
	if (sockets) {
		for (const sid of sockets) io.to(sid).emit(event, data);
	}
}

// ── Public API ───────────────────────────────────────────

export async function createTournament(
	name: string,
	createdBy: number,
	maxPlayers: number,
	settings: { speedPreset: string; winScore: number },
): Promise<number> {
	const [tournament] = await db.insert(tournaments).values({
		name,
		game_type: 'pong',
		status: 'scheduled',
		created_by: createdBy,
		max_players: maxPlayers,
		speed_preset: settings.speedPreset,
		win_score: settings.winScore,
	}).returning();
	return tournament.id;
}

export async function joinTournament(tournamentId: number, userId: number): Promise<{ success: boolean; error?: string }> {
	const [tournament] = await db.select().from(tournaments)
		.where(eq(tournaments.id, tournamentId));
	if (!tournament) return { success: false, error: 'Tournament not found' };
	if (tournament.status !== 'scheduled') return { success: false, error: 'Tournament already started' };

	// Check if already joined
	const [existing] = await db.select().from(tournamentParticipants)
		.where(and(
			eq(tournamentParticipants.tournament_id, tournamentId),
			eq(tournamentParticipants.user_id, userId),
		));
	if (existing) return { success: false, error: 'Already joined' };

	// Check if full
	const participants = await db.select().from(tournamentParticipants)
		.where(eq(tournamentParticipants.tournament_id, tournamentId));
	if (participants.length >= tournament.max_players) return { success: false, error: 'Tournament is full' };

	await db.insert(tournamentParticipants).values({
		tournament_id: tournamentId,
		user_id: userId,
		seed: participants.length + 1,
		status: 'registered',
	});
	return { success: true };
}

export async function leaveTournament(tournamentId: number, userId: number): Promise<boolean> {
	const [tournament] = await db.select().from(tournaments)
		.where(eq(tournaments.id, tournamentId));
	if (!tournament || tournament.status !== 'scheduled') return false;

	const result = await db.delete(tournamentParticipants)
		.where(and(
			eq(tournamentParticipants.tournament_id, tournamentId),
			eq(tournamentParticipants.user_id, userId),
		));
	return true;
}

export async function startTournament(
	tournamentId: number,
	requestedBy: number,
): Promise<BracketRound[] | null> {
	const [tournament] = await db.select().from(tournaments)
		.where(eq(tournaments.id, tournamentId));
	if (!tournament || tournament.created_by !== requestedBy) return null;
	if (tournament.status !== 'scheduled') return null;

	// Get participants with usernames
	const participants = await db.select({
		userId: tournamentParticipants.user_id,
		seed: tournamentParticipants.seed,
		username: users.username,
	})
		.from(tournamentParticipants)
		.innerJoin(users, eq(users.id, tournamentParticipants.user_id))
		.where(eq(tournamentParticipants.tournament_id, tournamentId));

	if (participants.length < 2) return null;

	// Build player list sorted by seed
	const players: BracketPlayer[] = participants
		.sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
		.map(p => ({ id: p.userId, username: p.username }));

	// Generate bracket
	const bracket = generateBracket(players);

	// Build player map for quick username lookup
	const playerMap = new Map<number, string>();
	for (const p of players) playerMap.set(p.id, p.username);

	// Save to memory
	activeTournaments.set(tournamentId, {
		id: tournamentId,
		bracket,
		settings: { speedPreset: tournament.speed_preset, winScore: tournament.win_score },
		createdBy: requestedBy,
		playerMap,
	});

	// Update DB
	await db.update(tournaments).set({
		status: 'in_progress',
		current_round: 1,
		started_at: new Date(),
	}).where(eq(tournaments.id, tournamentId));

	// Update all participants to active
	await db.update(tournamentParticipants).set({
		status: 'active',
	}).where(eq(tournamentParticipants.tournament_id, tournamentId));

	// Notify all participants
	emitToParticipants(tournamentId, 'tournament:started', {
		tournamentId,
		bracket,
	});

	// Start round 1 matches (skip byes)
	await startRoundMatches(tournamentId, 1);

	return bracket;
}

async function startRoundMatches(tournamentId: number, round: number): Promise<void> {
	const tourney = activeTournaments.get(tournamentId);
	if (!tourney) return;

	const roundData = tourney.bracket.find(r => r.round === round);
	if (!roundData) return;

	for (const match of roundData.matches) {
		if (match.status !== 'pending' || !match.player1Id || !match.player2Id) continue;

		match.status = 'playing';

		const roomId = `tournament-${tournamentId}-r${round}-m${match.matchIndex}`;
		const p1Username = tourney.playerMap.get(match.player1Id) ?? 'Player';
		const p2Username = tourney.playerMap.get(match.player2Id) ?? 'Player';

	// Create a GameRoom (same as regular online)
	createRoom(
		roomId,
		{ userId: match.player1Id, username: p1Username },
		{ userId: match.player2Id, username: p2Username },
		tourney.settings,
		tournamentBroadcastState,
		tournamentBroadcastEvent,
	);

	// Notify both players their match is ready
	const gameData = {
		roomId,
		player1: { userId: match.player1Id, username: p1Username },
		player2: { userId: match.player2Id, username: p2Username },
		settings: tourney.settings,
		tournamentId,
		round,
		matchIndex: match.matchIndex,
	};

		emitToUser(match.player1Id, 'tournament:match-ready', gameData);
		emitToUser(match.player2Id, 'tournament:match-ready', gameData);

		// Also send game:start so they navigate to the game page
		emitToUser(match.player1Id, 'game:start', gameData);
		emitToUser(match.player2Id, 'game:start', gameData);

		// 60s timeout — if the game hasn't started, auto-forfeit the absent player
		const capturedP1Id = match.player1Id;
		const capturedP2Id = match.player2Id;
		setTimeout(() => {
			const room = getRoom(roomId);
			if (!room) return; // already finished or destroyed
			const p1Joined = room.player1.socketIds.size > 0;
			const p2Joined = room.player2.socketIds.size > 0;
			if (p1Joined && p2Joined) return; // both present, game running
			if (!p1Joined && !p2Joined) {
				// Neither joined — destroy room, advance nobody (both eliminated)
				destroyRoom(roomId);
				return;
			}
			// One player missing — forfeit them
			const absentId = p1Joined ? capturedP2Id : capturedP1Id;
			room.forfeitByPlayer(absentId);
		}, 60_000);
	}

	// Broadcast updated bracket
	emitToParticipants(tournamentId, 'tournament:bracket-update', {
		tournamentId,
		bracket: tourney.bracket,
	});
}

export async function advanceWinner(
	tournamentId: number,
	round: number,
	matchIndex: number,
	winnerId: number,
	loserId: number,
): Promise<void> {
	const tourney = activeTournaments.get(tournamentId);
	if (!tourney) return;

	const roundData = tourney.bracket.find(r => r.round === round);
	if (!roundData) return;

	// Mark match finished
	const match = roundData.matches[matchIndex];
	if (match) {
		match.winnerId = winnerId;
		match.status = 'finished';
	}

	// Eliminate loser — calculate placement based on round
	// Final round loser = 2nd, semifinal losers = 3rd, quarterfinal losers = 5th, etc.
	const totalRounds = tourney.bracket.length;
	const placement = Math.pow(2, totalRounds - round) + 1;

	await db.update(tournamentParticipants).set({
		status: 'eliminated',
		placement,
		}).where(and(
			eq(tournamentParticipants.tournament_id, tournamentId),
			eq(tournamentParticipants.user_id, loserId),
	));

	emitToUser(loserId, 'tournament:eliminated', {
		tournamentId,
		round,
	});

	// Place winner in next round
	const nextRound = tourney.bracket.find(r => r.round === round + 1);
	if (nextRound) {
		const nextMatchIndex = Math.floor(matchIndex / 2);
		const nextMatch = nextRound.matches[nextMatchIndex];
		if (nextMatch) {
			const winnerUsername = tourney.playerMap.get(winnerId) ?? 'Player';
			if (matchIndex % 2 === 0) {
				nextMatch.player1Id = winnerId;
				nextMatch.player1Username = winnerUsername;
			} else {
				nextMatch.player2Id = winnerId;
				nextMatch.player2Username = winnerUsername;
			}

			emitToUser(winnerId, 'tournament:advanced', {
				tournamentId,
				nextRound: round + 1,
				nextMatchIndex,
			});

			// If both players are set, start the match
			if (nextMatch.player1Id && nextMatch.player2Id) {
				await startRoundMatches(tournamentId, round + 1);
			}
		}
	} else {
		// No next round — tournament is over!
		await db.update(tournaments).set({
			status: 'finished',
			winner_id: winnerId,
			finished_at: new Date(),
		}).where(eq(tournaments.id, tournamentId));

		await db.update(tournamentParticipants).set({
			status: 'champion',
			placement: 1,
			}).where(and(
				eq(tournamentParticipants.tournament_id, tournamentId),
				eq(tournamentParticipants.user_id, winnerId),
		));

		emitToParticipants(tournamentId, 'tournament:finished', {
			tournamentId,
			winnerId,
			winnerUsername: tourney.playerMap.get(winnerId),
			bracket: tourney.bracket,
		});

		activeTournaments.delete(tournamentId);
	}

	// Broadcast updated bracket to all participants
	if (activeTournaments.has(tournamentId)) {
		emitToParticipants(tournamentId, 'tournament:bracket-update', {
			tournamentId,
			bracket: tourney.bracket,
		});
	}
}

export function getActiveTournament(id: number) {
	return activeTournaments.get(id);
}

export function getActiveTournamentIds(): number[] {
	return Array.from(activeTournaments.keys());
}