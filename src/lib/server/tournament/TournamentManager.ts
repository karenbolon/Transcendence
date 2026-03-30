import { db } from '$lib/server/db';
import { tournaments, tournamentParticipants } from '$lib/server/db/schema';
import { users } from '$lib/server/db/schema';
import { eq, and, count } from 'drizzle-orm';
import {
	generateBracket,
	type BracketRound,
	type BracketPlayer,
} from './bracket';
import { createRoom, getRoom, destroyRoom } from '../socket/game/RoomManager';
import { getIO, userSockets } from '../socket/index';
import type { GameStateSnapshot } from '$lib/types/game';
import { tournamentLogger } from '$lib/server/logger';
import type { Pair } from '$lib/types/utils';
import { flipBy } from '$lib/types/utils';

type MatchPlayer = { userId: number; username: string };
type MatchPlayers = Pair<MatchPlayer>;

// ── Active Tournament Storage ────────────────────────────
// tournamentId → tournament state
const activeTournaments = new Map<
	number,
	{
		id: number;
		name: string;
		bracket: BracketRound[];
		settings: { speedPreset: string; winScore: number };
		createdBy: number;
		playerMap: Map<number, string>; // userId → username
	}
>();

// ── Helpers ──────────────────────────────────────────────

/** Broadcast to all sockets of both players in a room */
function tournamentBroadcastState(
	roomId: string,
	state: GameStateSnapshot,
): void {
	const io = getIO();
	const room = getRoom(roomId);
	if (!room) return;
	for (const sid of room.player1.socketIds)
		io.to(sid).emit('game:state', state);
	for (const sid of room.player2.socketIds)
		io.to(sid).emit('game:state', state);
}

function tournamentBroadcastEvent(
	roomId: string,
	event: string,
	data: any,
): void {
	const io = getIO();
	const room = getRoom(roomId);
	if (!room) return;
	for (const sid of room.player1.socketIds) io.to(sid).emit(event, data);
	for (const sid of room.player2.socketIds) io.to(sid).emit(event, data);
}

/** Emit event to all participants of a tournament */
function emitToParticipants(
	tournamentId: number,
	event: string,
	data: any,
): void {
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

/** Persist bracket JSON to the database */
async function saveBracketToDb(
	tournamentId: number,
	bracket: BracketRound[],
): Promise<void> {
	await db
		.update(tournaments)
		.set({
			bracket_data: JSON.parse(JSON.stringify(bracket)),
		})
		.where(eq(tournaments.id, tournamentId));
}

/** Convert round number to human-readable name */
function getRoundName(round: number, totalRounds: number): string {
	const fromFinal = totalRounds - round;
	if (fromFinal === 0) return 'Final';
	if (fromFinal === 1) return 'Semifinals';
	if (fromFinal === 2) return 'Quarterfinals';
	return `Round ${round}`;
}

// ── Public API ───────────────────────────────────────────

export async function createTournament(
	name: string,
	createdBy: number,
	maxPlayers: number,
	settings: { speedPreset: string; winScore: number },
): Promise<number> {
	const [tournament] = await db
		.insert(tournaments)
		.values({
			name,
			game_type: 'pong',
			status: 'scheduled',
			created_by: createdBy,
			max_players: maxPlayers,
			speed_preset: settings.speedPreset,
			win_score: settings.winScore,
		})
		.returning();
	return tournament.id;
}

export async function joinTournament(
	tournamentId: number,
	userId: number,
): Promise<{ success: boolean; error?: string }> {
	const [tournament] = await db
		.select()
		.from(tournaments)
		.where(eq(tournaments.id, tournamentId));
	if (!tournament) return { success: false, error: 'Tournament not found' };
	if (tournament.status !== 'scheduled')
		return { success: false, error: 'Tournament already started' };

	// Check if already joined
	const [existing] = await db
		.select()
		.from(tournamentParticipants)
		.where(
			and(
				eq(tournamentParticipants.tournament_id, tournamentId),
				eq(tournamentParticipants.user_id, userId),
			),
		);
	if (existing) return { success: false, error: 'Already joined' };

	// Check if full
	const participants = await db
		.select()
		.from(tournamentParticipants)
		.where(eq(tournamentParticipants.tournament_id, tournamentId));
	if (participants.length >= tournament.max_players)
		return { success: false, error: 'Tournament is full' };

	await db.insert(tournamentParticipants).values({
		tournament_id: tournamentId,
		user_id: userId,
		seed: participants.length + 1,
		status: 'registered',
	});
	return { success: true };
}

export async function leaveTournament(
	tournamentId: number,
	userId: number,
): Promise<boolean> {
	const [tournament] = await db
		.select()
		.from(tournaments)
		.where(eq(tournaments.id, tournamentId));
	if (!tournament) return false;

	// If scheduled or cancelled (not started), just remove them
	if (tournament.status === 'scheduled' || tournament.status === 'cancelled') {
		await db
			.delete(tournamentParticipants)
			.where(
				and(
					eq(tournamentParticipants.tournament_id, tournamentId),
					eq(tournamentParticipants.user_id, userId),
				),
			);
		return true;
	}

	// If in_progress, trigger elimination logic
	if (tournament.status === 'in_progress') {
		await playerDisconnectedFromTournament(tournamentId, userId);
		return true;
	}

	return false;
}

/**
 * Handles a player disconnecting/leaving from an in-progress tournament.
 * 
 * This function:
 * 1. Finds all of the player's remaining matches (pending/playing)
 * 2. Auto-forfeits them by advancing their opponents
 * 3. Checks if only 1 active player remains
 * 4. If so, declares that player tournament winner
 */
export async function playerDisconnectedFromTournament(
	tournamentId: number,
	userId: number,
): Promise<void> {
	const tourney = activeTournaments.get(tournamentId);
	if (!tourney) return;

	// Find all this player's remaining matches
	const remainingMatches: Array<{ round: number; matchIndex: number; isPlayer1: boolean; opponent: number | null }> = [];
	
	for (const round of tourney.bracket) {
		for (const match of round.matches) {
			if (match.status === 'finished' || match.status === 'bye') continue;

			let isPlayer1 = false;
			let opponent: number | null = null;

			if (match.player1Id === userId) {
				isPlayer1 = true;
				opponent = match.player2Id ?? null;
			} else if (match.player2Id === userId) {
				isPlayer1 = false;
				opponent = match.player1Id ?? null;
			}

			if (opponent !== null || (match.status === 'pending' && !opponent)) {
				remainingMatches.push({
					round: round.round,
					matchIndex: match.matchIndex,
					isPlayer1,
					opponent,
				});
			}
		}
	}

	// Auto-forfeit each match by advancing the opponent
	for (const remaining of remainingMatches) {
		if (remaining.opponent !== null) {
			// Opponent exists → advance them
			await advanceWinner(
				tournamentId,
				remaining.round,
				remaining.matchIndex,
				remaining.opponent,
				userId,
				1,
				0, // forfeit score: opponent wins 1-0
			);
		} else {
			// No opponent yet (pending match with bye or not scheduled)
			// Just mark as finished without advancing anyone
			const roundData = tourney.bracket.find(r => r.round === remaining.round);
			if (roundData) {
				const match = roundData.matches[remaining.matchIndex];
				if (match) match.status = 'finished';
			}
		}
	}

	// Check if only 1 active player remains
	const allParticipants = await db
		.select({ userId: tournamentParticipants.user_id, status: tournamentParticipants.status })
		.from(tournamentParticipants)
		.where(eq(tournamentParticipants.tournament_id, tournamentId));

	const activePlayers = allParticipants.filter(p => p.status === 'active');
	
	if (activePlayers.length === 1) {
		// Only 1 player left → declare them winner
		const winnerId = activePlayers[0].userId;
		const totalRounds = tourney.bracket.length;
		const finalRound = tourney.bracket[totalRounds - 1];
		
		// Mark winner as champion
		await db
			.update(tournamentParticipants)
			.set({ status: 'champion', placement: 1 })
			.where(
				and(
					eq(tournamentParticipants.tournament_id, tournamentId),
					eq(tournamentParticipants.user_id, winnerId),
				),
			);

		// Mark tournament as finished
		await db
			.update(tournaments)
			.set({ status: 'finished', winner_id: winnerId })
			.where(eq(tournaments.id, tournamentId));

		// Emit tournament finished to all participants
		const podiumParticipants = await db
			.select({
				userId: tournamentParticipants.user_id,
				username: users.username,
				placement: tournamentParticipants.placement,
				avatarUrl: users.avatar_url,
			})
			.from(tournamentParticipants)
			.innerJoin(users, eq(users.id, tournamentParticipants.user_id))
			.where(eq(tournamentParticipants.tournament_id, tournamentId))
			.orderBy(tournamentParticipants.placement);

		const podium = podiumParticipants
			.filter((p) => p.placement !== null && p.placement <= 3)
			.map((p) => ({
				userId: p.userId,
				username: p.username,
				avatarUrl: p.avatarUrl,
				placement: p.placement!,
			}));

		const winnerWins = tourney.bracket.reduce((count, r) => {
			return count + r.matches.filter((m) => m.winnerId === winnerId).length;
		}, 0);

		emitToParticipants(tournamentId, 'tournament:finished', {
			tournamentId,
			winnerId,
			winnerUsername: tourney.playerMap.get(winnerId),
			tournamentName: tourney.name,
			podium,
			championWins: winnerWins,
			bracket: tourney.bracket,
		});

		activeTournaments.delete(tournamentId);
		getIO().emit('tournament:list-updated');
	} else {
		// Persist bracket and notify remaining players
		await saveBracketToDb(tournamentId, tourney.bracket);
		if (activeTournaments.has(tournamentId)) {
			emitToParticipants(tournamentId, 'tournament:bracket-update', {
				tournamentId,
				bracket: tourney.bracket,
			});
		}
	}
}

export async function cancelTournament(
	tournamentId: number,
	requestedBy: number,
): Promise<boolean> {
	const [tournament] = await db
		.select()
		.from(tournaments)
		.where(eq(tournaments.id, tournamentId));
	if (!tournament || tournament.created_by !== requestedBy) return false;
	if (tournament.status !== 'scheduled') return false;

	// Delete participants first (foreign key), then tournament
	await db
		.delete(tournamentParticipants)
		.where(eq(tournamentParticipants.tournament_id, tournamentId));
	await db.delete(tournaments).where(eq(tournaments.id, tournamentId));
	return true;
}

export async function startTournament(
	tournamentId: number,
	requestedBy: number,
): Promise<BracketRound[] | null> {
	const [tournament] = await db
		.select()
		.from(tournaments)
		.where(eq(tournaments.id, tournamentId));
	if (!tournament || tournament.created_by !== requestedBy) return null;
	if (tournament.status !== 'scheduled') return null;

	// Get participants with usernames
	const participants = await db
		.select({
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
		.map((p) => ({ id: p.userId, username: p.username }));

	// Generate bracket
	const bracket = generateBracket(players);

	// Build player map for quick username lookup
	const playerMap = new Map<number, string>();
	for (const p of players) playerMap.set(p.id, p.username);

	// Save to memory
	activeTournaments.set(tournamentId, {
		id: tournamentId,
		name: tournament.name,
		bracket,
		settings: {
			speedPreset: tournament.speed_preset,
			winScore: tournament.win_score,
		},
		createdBy: requestedBy,
		playerMap,
	});

	// Update DB (including initial bracket)
	await db
		.update(tournaments)
		.set({
			status: 'in_progress',
			current_round: 1,
			started_at: new Date(),
			bracket_data: JSON.parse(JSON.stringify(bracket)),
		})
		.where(eq(tournaments.id, tournamentId));

	// Update all participants to active
	await db
		.update(tournamentParticipants)
		.set({
			status: 'active',
		})
		.where(eq(tournamentParticipants.tournament_id, tournamentId));

	// Notify all participants
	emitToParticipants(tournamentId, 'tournament:started', {
		tournamentId,
		bracket,
	});

	// Notify ALL clients so tournament list pages refresh
	getIO().emit('tournament:list-updated');

	// Start round 1 matches (skip byes)
	await startRoundMatches(tournamentId, 1);

	return bracket;
}

/**
 * Starts all pending matches for a given tournament round by creating
 * {@link GameRoom} instances and notifying both players via socket events.
 *
 * For each pending match:
 * 1. Sets match status to `'playing'` and creates a `GameRoom` with a
 *    deterministic room ID (`tournament-{id}-r{round}-m{matchIndex}`).
 * 2. Emits `tournament:match-ready` and `game:start` to both players so
 *    their clients navigate to the game page.
 * 3. Registers a 60-second join timeout (see bug fix below).
 *
 * After all matches are started, broadcasts `tournament:bracket-update`
 * to all participants.
 *
 * ---
 *
 * **Bug fix — tournament stuck in progress when a player fails to join**
 * {@link https://github.com/karenbolon/Transcendence/issues/91 Issue #91}
 *
 * **Problem:** The 60-second timeout called `room.forfeitByPlayer(absentId)`,
 * which routes through `GameRoom.handleForfeit()`. Because the game had not
 * started yet, that path emits `game:cancelled` with no winner — so
 * `advanceWinner()` was never called, the match remained in `'playing'` state
 * indefinitely, and the tournament could not finish.
 *
 * **Fix:** When exactly one player is absent at timeout, destroy the room and
 * call `advanceWinner()` directly, bypassing `GameRoom.handleForfeit()`.
 * `handleForfeit()` is correct for casual games (no-winner cancellation) but
 * tournament matches must always produce a winner.
 *
 * ```typescript
 * const absentId  = p1Joined ? capturedP2Id : capturedP1Id;
 * const presentId = p1Joined ? capturedP1Id : capturedP2Id;
 * destroyRoom(roomId);
 * await advanceWinner(tournamentId, round, match.matchIndex, presentId, absentId, 0, 0);
 * ```
 *
 * @param tournamentId - ID of the active tournament.
 * @param round        - Round number whose pending matches should be started (1-based).
 *
 * @see {@link advanceWinner}   - Advances the bracket and eliminates the loser.
 * @see {@link GameRoom.handleForfeit} - Handles forfeits for casual games; emits
 *   `game:cancelled` when the game has not yet started — do **not** rely on this
 *   path for tournament advancement.
 * @see {@link https://github.com/karenbolon/Transcendence/issues/91 Issue #91}
 */
async function startRoundMatches(
	tournamentId: number,
	round: number,
): Promise<void> {
	const tourney = activeTournaments.get(tournamentId);
	if (!tourney) return;

	const roundData = tourney.bracket.find((r) => r.round === round);
	if (!roundData) return;

	for (const match of roundData.matches) {
		if (match.status !== 'pending' || !match.player1Id || !match.player2Id)
			continue;

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
		const players: MatchPlayers = [gameData.player1, gameData.player2];

		emitToUser(match.player1Id, 'tournament:match-ready', gameData);
		emitToUser(match.player2Id, 'tournament:match-ready', gameData);

		// Also send game:start so they navigate to the game page
		emitToUser(match.player1Id, 'game:start', gameData);
		emitToUser(match.player2Id, 'game:start', gameData);

		// 60s timeout — if the game hasn't started, auto-forfeit the absent player
		const capturedP1Id = match.player1Id;
		const capturedP2Id = match.player2Id;

		setTimeout(async () => {
			try {
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

				if (p1Joined !== p2Joined) {
					const presentPlayer = p1Joined ? players[0] : players[1];
					const absentPlayer = flipBy(players, presentPlayer, 'userId');
					destroyRoom(roomId);
					await advanceWinner(
						tournamentId,
						round,
						match.matchIndex,
						presentPlayer.userId,
						absentPlayer.userId,
						1,
						0,
					);
				}
			} catch (err) {
				tournamentLogger.error(
					{ err },
					'Failed o advance winner after join timeut',
				);
			}
		}, 60_000);
	}

	// Broadcast updated bracket
	emitToParticipants(tournamentId, 'tournament:bracket-update', {
		tournamentId,
		bracket: tourney.bracket,
	});
}

/**
 * Records the result of a finished tournament match, eliminates the loser,
 * and either advances the winner to the next round or concludes the tournament.
 * bs
 * **What this function does, in order:**
 * 1. Marks the match as `'finished'` in the in-memory bracket and records scores.
 * 2. Computes the loser's placement (`totalPlayers - alreadyEliminated`) so that
 *    players eliminated later receive a better rank.
 * 3. Persists the loser's `status = 'eliminated'` and `placement` to the DB.
 * 4. If a next round exists:
 *    - Emits `tournament:eliminated` to the loser with stats and bracket context.
 *    - Places the winner in the correct slot of the next-round match
 *      (`matchIndex % 2 === 0` → player1 slot, otherwise → player2 slot).
 *    - Emits `tournament:advanced` to the winner with next-opponent info.
 *    - If both players of the next match are now set, schedules
 *      {@link startRoundMatches} after a 10-second delay (result-screen grace period).
 * 5. If no next round exists (final match):
 *    - Sets tournament `status = 'finished'` and records `winner_id` in the DB.
 *    - Marks the winner as `status = 'champion'`, `placement = 1`.
 *    - Builds the podium (top-3 participants by placement).
 *    - Emits `tournament:finished` to all participants with podium and bracket.
 *    - Removes the tournament from `activeTournaments`.
 * 6. Persists the full bracket JSON to the DB and broadcasts
 *    `tournament:bracket-update` to all remaining participants.
 *
 * ---
 *
 * **Placement algorithm:**
 * `placement = totalPlayers - eliminatedCount` at the time of elimination.
 * This guarantees unique, descending placements: the last player eliminated
 * before the final gets placement 2 (runner-up), and so on.
 *
 * ---
 *
 * **Called from two sites:**
 * - `GameRoom.handleGameOver()` — normal match completion via gameplay.
 * - The 60-second join timeout in {@link startRoundMatches} — forfeit when a
 *   player fails to connect. See {@link https://github.com/karenbolon/Transcendence/issues/91 Issue #91}.
 *
 * @param tournamentId - ID of the active tournament (must exist in `activeTournaments`).
 * @param round        - 1-based round number of the completed match.
 * @param matchIndex   - 0-based index of the match within that round.
 * @param winnerId     - User ID of the match winner.
 * @param loserId      - User ID of the match loser.
 * @param winnerScore  - Goals scored by the winner (default `0` for forfeits).
 * @param loserScore   - Goals scored by the loser (default `0` for forfeits).
 *
 * @returns `Promise<void>` — resolves after all DB writes and socket emissions complete.
 *
 * @see {@link startRoundMatches} - Starts matches for a round; schedules the next
 *   round via a 10-second timeout once both players are placed.
 * @see {@link GameRoom.handleGameOver} - Normal completion path that calls this function.
 * @see {@link https://github.com/karenbolon/Transcendence/issues/91 Issue #91} - Bug fix:
 *   tournament stuck in progress when a player fails to join a match.
 */
export async function advanceWinner(
	tournamentId: number,
	round: number,
	matchIndex: number,
	winnerId: number,
	loserId: number,
	winnerScore: number = 0,
	loserScore: number = 0,
): Promise<void> {
	const tourney = activeTournaments.get(tournamentId);
	if (!tourney) return;

	const roundData = tourney.bracket.find((r) => r.round === round);
	if (!roundData) return;

	// Mark match finished with scores
	const match = roundData.matches[matchIndex];
	if (match) {
		match.winnerId = winnerId;
		match.status = 'finished';
		// Map winner/loser scores to player1/player2 slots
		if (match.player1Id === winnerId) {
			match.player1Score = winnerScore;
			match.player2Score = loserScore;
		} else {
			match.player1Score = loserScore;
			match.player2Score = winnerScore;
		}
	}

	// Eliminate loser — placement = totalPlayers - alreadyEliminated
	// This gives unique placements: last eliminated = better rank
	const totalRounds = tourney.bracket.length;
	const totalPlayers = tourney.playerMap.size;
	const [{ value: eliminatedCount }] = await db
		.select({ value: count() })
		.from(tournamentParticipants)
		.where(
			and(
				eq(tournamentParticipants.tournament_id, tournamentId),
				eq(tournamentParticipants.status, 'eliminated'),
			),
		);
	const placement = totalPlayers - Number(eliminatedCount);

	await db
		.update(tournamentParticipants)
		.set({
			status: 'eliminated',
			placement,
		})
		.where(
			and(
				eq(tournamentParticipants.tournament_id, tournamentId),
				eq(tournamentParticipants.user_id, loserId),
			),
		);

	// Place winner in next round
	const nextRound = tourney.bracket.find((r) => r.round === round + 1);

	// Count how many matches this player won in the tournament
	const loserWins = tourney.bracket.reduce((count, r) => {
		return count + r.matches.filter((m) => m.winnerId === loserId).length;
	}, 0);

	// Find the next match happening in the tournament (for "Tournament continues..." card)
	let tournamentContinues: {
		player1Username: string;
		player2Username: string;
		roundName: string;
	} | null = null;
	if (nextRound) {
		const nextMatchForViewer =
			nextRound.matches.find(
				(m) => m.player1Id && m.player2Id && m.status === 'pending',
			) ?? nextRound.matches.find((m) => m.player1Id || m.player2Id);
		if (
			nextMatchForViewer &&
			nextMatchForViewer.player1Username &&
			nextMatchForViewer.player2Username
		) {
			tournamentContinues = {
				player1Username: nextMatchForViewer.player1Username,
				player2Username: nextMatchForViewer.player2Username,
				roundName: getRoundName(round + 1, totalRounds),
			};
		}
	}

	if (nextRound) {
		// Emit tournament:eliminated for non-final rounds only
		// Final round loser gets tournament:finished instead (shows runner-up screen)
		emitToUser(loserId, 'tournament:eliminated', {
			tournamentId,
			round,
			placement,
			totalRounds,
			tournamentName: tourney.name,
			roundName: getRoundName(round, totalRounds),
			tournamentWins: loserWins,
			tournamentLosses: 1,
			tournamentContinues,
		});
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

			// Look up next opponent info (if they're already set in the next match)
			const nextOpponentId =
				matchIndex % 2 === 0 ? nextMatch.player2Id : nextMatch.player1Id;
			let nextOpponentInfo: {
				username: string;
				wins: number;
				seed: number;
			} | null = null;
			if (nextOpponentId) {
				const [opponentUser] = await db
					.select({ wins: users.wins })
					.from(users)
					.where(eq(users.id, nextOpponentId));
				const [opponentParticipant] = await db
					.select({ seed: tournamentParticipants.seed })
					.from(tournamentParticipants)
					.where(
						and(
							eq(tournamentParticipants.tournament_id, tournamentId),
							eq(tournamentParticipants.user_id, nextOpponentId),
						),
					);
				nextOpponentInfo = {
					username: tourney.playerMap.get(nextOpponentId) ?? 'Player',
					wins: opponentUser?.wins ?? 0,
					seed: opponentParticipant?.seed ?? 0,
				};
			}

			// Count winner's tournament wins so far
			const winnerTournamentWins = tourney.bracket.reduce((count, r) => {
				return count + r.matches.filter((m) => m.winnerId === winnerId).length;
			}, 0);

			emitToUser(winnerId, 'tournament:advanced', {
				tournamentId,
				round,
				nextRound: round + 1,
				nextMatchIndex,
				totalRounds,
				tournamentName: tourney.name,
				roundName: getRoundName(round, totalRounds),
				nextRoundName: getRoundName(round + 1, totalRounds),
				nextOpponent: nextOpponentInfo,
				tournamentWins: winnerTournamentWins,
			});

			// If both players are set, start the match after a delay
			// so players can see their result screen (advancing/eliminated)
			if (nextMatch.player1Id && nextMatch.player2Id) {
				const capturedTournamentId = tournamentId;
				const capturedNextRound = round + 1;
				setTimeout(() => {
					startRoundMatches(capturedTournamentId, capturedNextRound);
				}, 10_000);
			}
		}
	} else {
		// No next round — tournament is over!
		await db
			.update(tournaments)
			.set({
				status: 'finished',
				winner_id: winnerId,
				finished_at: new Date(),
			})
			.where(eq(tournaments.id, tournamentId));

		await db
			.update(tournamentParticipants)
			.set({
				status: 'champion',
				placement: 1,
			})
			.where(
				and(
					eq(tournamentParticipants.tournament_id, tournamentId),
					eq(tournamentParticipants.user_id, winnerId),
				),
			);

		// Build podium (top 3)
		const podiumParticipants = await db
			.select({
				userId: tournamentParticipants.user_id,
				placement: tournamentParticipants.placement,
				username: users.username,
				avatarUrl: users.avatar_url,
			})
			.from(tournamentParticipants)
			.innerJoin(users, eq(users.id, tournamentParticipants.user_id))
			.where(eq(tournamentParticipants.tournament_id, tournamentId))
			.orderBy(tournamentParticipants.placement);

		const podium = podiumParticipants
			.filter((p) => p.placement !== null && p.placement <= 3)
			.map((p) => ({
				userId: p.userId,
				username: p.username,
				avatarUrl: p.avatarUrl,
				placement: p.placement!,
			}));

		// Count champion's wins
		const championWins = tourney.bracket.reduce((count, r) => {
			return count + r.matches.filter((m) => m.winnerId === winnerId).length;
		}, 0);

		// Count runner-up's wins
		const runnerUpWins = tourney.bracket.reduce((count, r) => {
			return count + r.matches.filter((m) => m.winnerId === loserId).length;
		}, 0);

		emitToParticipants(tournamentId, 'tournament:finished', {
			tournamentId,
			winnerId,
			loserId,
			winnerUsername: tourney.playerMap.get(winnerId),
			tournamentName: tourney.name,
			round,
			totalRounds,
			roundName: getRoundName(round, totalRounds),
			podium,
			championWins,
			runnerUpWins,
			bracket: tourney.bracket,
		});

		activeTournaments.delete(tournamentId);

		// Notify ALL clients so tournament list pages refresh
		getIO().emit('tournament:list-updated');
	}

	// Persist bracket to DB and broadcast to all participants
	await saveBracketToDb(tournamentId, tourney.bracket);
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
