import { db } from '$lib/server/db';
import { tournaments, tournamentParticipants, tournamentInvites, messages, tournamentMessages } from '$lib/server/db/schema';
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

// Track pending timeouts per tournament so we can cancel them on cancel/finish
const tournamentTimeouts = new Map<number, Set<ReturnType<typeof setTimeout>>>();

// Dedup guard: prevent scheduling the same round twice (see Task 5)
const scheduledRounds = new Set<string>();

function addTrackedTimeout(tournamentId: number, callback: () => void, ms: number): ReturnType<typeof setTimeout> {
	const timer = setTimeout(() => {
		tournamentTimeouts.get(tournamentId)?.delete(timer);
		callback();
	}, ms);
	if (!tournamentTimeouts.has(tournamentId)) {
		tournamentTimeouts.set(tournamentId, new Set());
	}
	tournamentTimeouts.get(tournamentId)!.add(timer);
	return timer;
}

function clearTournamentTimeouts(tournamentId: number): void {
	const timeouts = tournamentTimeouts.get(tournamentId);
	if (timeouts) {
		for (const timer of timeouts) clearTimeout(timer);
		timeouts.clear();
		tournamentTimeouts.delete(tournamentId);
	}
	for (const key of scheduledRounds) {
		if (key.startsWith(`${tournamentId}-`)) {
			scheduledRounds.delete(key);
		}
	}
}

// ── Helpers ──────────────────────────────────────────────

/** Check if a tournament participant is a bot (username starts with "[BOT]"). */
function isBot(playerId: number, playerMap: Map<number, string>): boolean {
	const username = playerMap.get(playerId);
	return username != null && username.startsWith('[BOT]');
}

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
	// Spectators
	for (const sid of room.spectators)
		io.to(sid).emit('game:state', state);
}

function ordinal(n: number): string {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return n + (s[(v - 20) % 10] || s[v] || s[0]);
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
	// Spectators
	for (const sid of room.spectators) io.to(sid).emit(event, data);
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

/** Insert a system message into tournament chat and broadcast it */
async function insertTournamentSystemMessage(
	tournamentId: number,
	content: string,
): Promise<void> {
	const tourney = activeTournaments.get(tournamentId);
 	if (!tourney) return;
	const [msg] = await db.insert(tournamentMessages).values({
		tournament_id: tournamentId,
		user_id: tourney.createdBy, // Use creator as the system message author
		content,
		type: 'system',
	}).returning();

	const io = getIO();
	const payload = {
		id: msg.id,
		tournamentId,
		userId: tourney.createdBy,
		username: 'System',
		avatarUrl: null,
		content,
		type: 'system',
		createdAt: msg.created_at instanceof Date ? msg.created_at.toISOString() : String(msg.created_at),
	};
	for (const [uid] of tourney.playerMap) {
		const sockets = userSockets.get(uid);
		if (sockets) {
			for (const sid of sockets) io.to(sid).emit('tournament:chat-message', payload);
		}
	}
}

// ── Public API ───────────────────────────────────────────

export async function createTournament(
	name: string,
	createdBy: number,
	maxPlayers: number,
	settings: { speedPreset: string; winScore: number },
	isPrivate: boolean = false,
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
			is_private: isPrivate,
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
	// Private tournament — check for invite
	if (tournament.is_private) {
		const [invite] = await db
			.select()
			.from(tournamentInvites)
			.where(
				and(
					eq(tournamentInvites.tournament_id, tournamentId),
					eq(tournamentInvites.invited_user_id, userId),
				),
			);
		// Creator can always join (they created it)
		if (!invite && tournament.created_by !== userId) {
			return { success: false, error: 'Invite required for private tournament' };
		}
	}

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
	if (!tournament || tournament.status !== 'scheduled') return false;

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

export async function cancelTournament(
	tournamentId: number,
	requestedBy: number,
): Promise<{ success: false } | { success: true; tournamentName: string; participantUserIds: number[] }> {
	const [tournament] = await db
		.select()
		.from(tournaments)
		.where(eq(tournaments.id, tournamentId));
	if (!tournament || tournament.created_by !== requestedBy) return { success: false };
	if (tournament.status !== 'scheduled' && tournament.status !== 'in_progress') return { success: false };

	// Clean up in-memory state for in-progress tournaments
	clearTournamentTimeouts(tournamentId);

	const tourney = activeTournaments.get(tournamentId);
	if (tourney) {
		for (const roundData of tourney.bracket) {
			for (const match of roundData.matches) {
				if (match.status === 'playing') {
					const roomId = `tournament-${tournamentId}-r${roundData.round}-m${match.matchIndex}`;
					const room = getRoom(roomId);
					if (room) {
						tournamentBroadcastEvent(roomId, 'game:cancelled', {
							roomId,
							reason: 'Tournament was cancelled',
						});
						destroyRoom(roomId);
					}
				}
			}
		}
		activeTournaments.delete(tournamentId);
	}

	// Fetch participant IDs before deleting so we can notify them
	const participants = await db
		.select({ userId: tournamentParticipants.user_id })
		.from(tournamentParticipants)
		.where(eq(tournamentParticipants.tournament_id, tournamentId));

	// Delete in correct order to respect FK constraints:
	// 1. Messages referencing invites (no cascade on tournament_invite_id)
	// 2. Invites (cascades from tournament delete, but messages block it)
	// 3. Tournament messages
	// 4. Participants
	// 5. Tournament
	const inviteIds = await db
		.select({ id: tournamentInvites.id })
		.from(tournamentInvites)
		.where(eq(tournamentInvites.tournament_id, tournamentId));
	if (inviteIds.length > 0) {
		for (const { id } of inviteIds) {
			await db.update(messages)
				.set({ tournament_invite_id: null })
				.where(eq(messages.tournament_invite_id, id));
		}
		await db.delete(tournamentInvites)
			.where(eq(tournamentInvites.tournament_id, tournamentId));
	}
	await db.delete(tournamentMessages)
		.where(eq(tournamentMessages.tournament_id, tournamentId));
	await db.delete(tournamentParticipants)
		.where(eq(tournamentParticipants.tournament_id, tournamentId));
	await db.delete(tournaments).where(eq(tournaments.id, tournamentId));
	return {
		success: true,
		tournamentName: tournament.name,
		participantUserIds: participants.map(p => p.userId),
	};
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

		const p1IsBot = isBot(match.player1Id, tourney.playerMap);
		const p2IsBot = isBot(match.player2Id, tourney.playerMap);

		// Auto-resolve matches involving bots
		if (p1IsBot || p2IsBot) {
			let winnerId: number;
			let loserId: number;
			let winnerScore = tourney.settings.winScore;
			let loserScore = Math.floor(Math.random() * (tourney.settings.winScore - 1));

			if (p1IsBot && p2IsBot) {
				// Both bots — random winner
				if (Math.random() < 0.5) {
					winnerId = match.player1Id;
					loserId = match.player2Id;
				} else {
					winnerId = match.player2Id;
					loserId = match.player1Id;
				}
			} else {
				// Human vs bot — human always wins
				winnerId = p1IsBot ? match.player2Id : match.player1Id;
				loserId = p1IsBot ? match.player1Id : match.player2Id;
			}

			match.status = 'finished';
			match.winnerId = winnerId;
			if (match.player1Id === winnerId) {
				match.player1Score = winnerScore;
				match.player2Score = loserScore;
			} else {
				match.player1Score = loserScore;
				match.player2Score = winnerScore;
			}

			// Small delay so bracket updates don't all fire at once
			const capturedMatch = { ...match };
			setTimeout(async () => {
				await advanceWinner(tournamentId, round, capturedMatch.matchIndex, winnerId, loserId, winnerScore, loserScore);
			}, 500 * match.matchIndex);
			continue;
		}

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

		addTrackedTimeout(tournamentId, async () => {
			try {
				// If match already finished (game ended normally), skip
				const currentMatch = tourney.bracket.find((r) => r.round === round)?.matches[match.matchIndex];
				if (currentMatch?.status === 'finished') return;

				const room = getRoom(roomId);
				if (!room) return; // already finished or destroyed
				const p1Joined = room.player1.socketIds.size > 0;
				const p2Joined = room.player2.socketIds.size > 0;
				if (p1Joined && p2Joined) return; // both present, game running
				if (!p1Joined && !p2Joined) {
					// Neither joined — advance player1 by default (higher seed).
					// Arbitrary, but tournament MUST advance to avoid stuck state.
					destroyRoom(roomId);
					tournamentLogger.warn(
						`Neither player joined match r${round}-m${match.matchIndex} in tournament ${tournamentId}. Auto-advancing p1 (id=${capturedP1Id}).`,
					);
					await advanceWinner(
						tournamentId,
						round,
						match.matchIndex,
						capturedP1Id,
						capturedP2Id,
						0,
						0,
					);
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

		// 15-minute safety timeout — force-end stuck games
		addTrackedTimeout(tournamentId, async () => {
			try {
				const room = getRoom(roomId);
				if (!room) return;

				const rd = tourney.bracket.find((r) => r.round === round);
				const m = rd?.matches[match.matchIndex];
				if (m?.status === 'finished') return;

				tournamentLogger.warn(
					`Match r${round}-m${match.matchIndex} in tournament ${tournamentId} hit 15-minute timeout. Force-ending.`,
				);

				const state = room.getState();
				let forceWinnerId: number;
				let forceLoserId: number;
				if (state.score1 > state.score2) {
					forceWinnerId = capturedP1Id;
					forceLoserId = capturedP2Id;
				} else if (state.score2 > state.score1) {
					forceWinnerId = capturedP2Id;
					forceLoserId = capturedP1Id;
				} else {
					// Tied — advance player1 (higher seed)
					forceWinnerId = capturedP1Id;
					forceLoserId = capturedP2Id;
				}

				destroyRoom(roomId);
				await advanceWinner(
					tournamentId,
					round,
					match.matchIndex,
					forceWinnerId,
					forceLoserId,
					state.score1,
					state.score2,
				);
			} catch (err) {
				tournamentLogger.error({ err }, 'Failed to handle 15-min match timeout');
			}
		}, 15 * 60 * 1000);
	}

	// Broadcast updated bracket
	emitToParticipants(tournamentId, 'tournament:bracket-update', {
		tournamentId,
		bracket: tourney.bracket,
	});

	// System message in tournament chat
	const roundName = getRoundName(round, tourney.bracket.length);
	await insertTournamentSystemMessage(tournamentId, `${roundName} is starting!`);
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
	if (!match || match.status === 'finished') {
		tournamentLogger.warn(
			`advanceWinner called for already-finished or missing match r${round}-m${matchIndex} in tournament ${tournamentId}. Ignoring.`,
		);
		return;
	}
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

	// System message: player eliminated
	const loserUsername = tourney.playerMap.get(loserId) ?? 'Player';
	await insertTournamentSystemMessage(
			tournamentId,
			`${loserUsername} eliminated (${ordinal(placement)} place)`,
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

	console.log(`[Tournament] advanceWinner: round=${round}, totalRounds=${totalRounds}, nextRound=${!!nextRound}`);
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
				const scheduleKey = `${capturedTournamentId}-${capturedNextRound}`;

				if (!scheduledRounds.has(scheduleKey)) {
					scheduledRounds.add(scheduleKey);
					addTrackedTimeout(capturedTournamentId, () => {
						scheduledRounds.delete(scheduleKey);
						startRoundMatches(capturedTournamentId, capturedNextRound);
					}, 10_000);
				}
			}
		}

		// Non-final round: persist bracket and broadcast update
		await saveBracketToDb(tournamentId, tourney.bracket);
		emitToParticipants(tournamentId, 'tournament:bracket-update', {
			tournamentId,
			bracket: tourney.bracket,
		});
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
		const winnerUsername = tourney.playerMap.get(winnerId) ?? 'Player';
		await insertTournamentSystemMessage(
			tournamentId,
			`${winnerUsername} wins the tournament!`,
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

		// Save bracket to DB BEFORE emitting events and deleting from memory.
		// Otherwise invalidateAll() on the client races with saveBracketToDb:
		// the page load can't find the in-memory bracket (already deleted) and
		// reads stale bracket_data from the DB.
		await saveBracketToDb(tournamentId, tourney.bracket);

		console.log(`[Tournament] Emitting tournament:finished for tournament ${tournamentId}, winner=${winnerId}, loser=${loserId}`);
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

		clearTournamentTimeouts(tournamentId);
		activeTournaments.delete(tournamentId);

		// Notify ALL clients so tournament list pages refresh
		getIO().emit('tournament:list-updated');
	}
}

// ── Tournament Invites ──────────────────────────────────
export async function inviteToTournament(
	tournamentId: number,
	invitedBy: number,
	invitedUserId: number,
): Promise<{ success: boolean; inviteId?: number; error?: string }> {
	// Validate tournament exists and is scheduled
	const [tournament] = await db
		.select()
		.from(tournaments)
		.where(eq(tournaments.id, tournamentId));
	if (!tournament) return { success: false, error: 'Tournament not found' };
	if (tournament.status !== 'scheduled')
		return { success: false, error: 'Tournament already started' };
	if (!tournament.is_private)
		return { success: false, error: 'Tournament is not private' };

	// Only creator can invite
	if (tournament.created_by !== invitedBy)
		return { success: false, error: 'Only the creator can invite' };

	// Can't invite yourself
	if (invitedBy === invitedUserId)
		return { success: false, error: 'Cannot invite yourself' };

	// Check if already invited
	const [existing] = await db
		.select()
		.from(tournamentInvites)
		.where(
			and(
				eq(tournamentInvites.tournament_id, tournamentId),
				eq(tournamentInvites.invited_user_id, invitedUserId),
			),
		);
	if (existing) return { success: false, error: 'Already invited' };

	// Check if already a participant
	const [alreadyJoined] = await db
		.select()
		.from(tournamentParticipants)
		.where(
			and(
				eq(tournamentParticipants.tournament_id, tournamentId),
				eq(tournamentParticipants.user_id, invitedUserId),
			),
		);
	if (alreadyJoined) return { success: false, error: 'Already in tournament' };

	// Insert invite
	const [invite] = await db
		.insert(tournamentInvites)
		.values({
			tournament_id: tournamentId,
			invited_by: invitedBy,
			invited_user_id: invitedUserId,
		})
		.returning();

	// Get invite details for the chat message
	const [inviter] = await db
		.select({ username: users.username })
		.from(users)
		.where(eq(users.id, invitedBy));

	// Get participant count
	const participantRows = await db
		.select()
		.from(tournamentParticipants)
		.where(eq(tournamentParticipants.tournament_id, tournamentId));

	// Insert special chat message with the invite card
	await db.insert(messages).values({
		sender_id: invitedBy,
		recipient_id: invitedUserId,
		type: 'tournament_invite',
		content: JSON.stringify({
			tournamentId,
			tournamentName: tournament.name,
			maxPlayers: tournament.max_players,
			participantCount: participantRows.length,
			speedPreset: tournament.speed_preset,
			inviterUsername: inviter?.username ?? 'Someone',
		}),
		tournament_invite_id: invite.id,
	});

	// Notify the invited user in real-time
	emitToUser(invitedUserId, 'tournament:invited', {
		inviteId: invite.id,
		tournamentId,
		tournamentName: tournament.name,
		invitedBy,
		inviterUsername: inviter?.username ?? 'Someone',
		maxPlayers: tournament.max_players,
		participantCount: participantRows.length,
		speedPreset: tournament.speed_preset,
	});

	return { success: true, inviteId: invite.id };
}

export async function respondToInvite(
	inviteId: number,
	userId: number,
	accept: boolean,
): Promise<{ success: boolean; tournamentId?: number; error?: string }> {
	const [invite] = await db
		.select()
		.from(tournamentInvites)
		.where(eq(tournamentInvites.id, inviteId));
	if (!invite) return { success: false, error: 'Invite not found' };
	if (invite.invited_user_id !== userId)
		return { success: false, error: 'Not your invite' };
	if (invite.status !== 'pending')
		return { success: false, error: 'Invite already responded' };

	// Update invite status
	await db
		.update(tournamentInvites)
		.set({ status: accept ? 'accepted' : 'declined' })
		.where(eq(tournamentInvites.id, inviteId));

	if (accept) {
		// Auto-join the tournament
		const result = await joinTournament(invite.tournament_id, userId);
		if (!result.success)
			return { success: false, error: result.error };
	}

	// Notify the inviter
	const [invitedUser] = await db
		.select({ username: users.username })
		.from(users)
		.where(eq(users.id, userId));

	emitToUser(invite.invited_by, accept ? 'tournament:invite-accepted' : 'tournament:invite-declined', {
		inviteId,
		tournamentId: invite.tournament_id,
		userId,
		username: invitedUser?.username ?? 'Someone',
	});

	return { success: true, tournamentId: invite.tournament_id };
}

export function getActiveTournament(id: number) {
	return activeTournaments.get(id);
}

export function getActiveTournamentIds(): number[] {
	return Array.from(activeTournaments.keys());
}
