import { GameRoom } from './GameRoom';
import type { GameResult, GameStateSnapshot } from '$lib/types/game';
import { db } from '$lib/server/db';
import { games, users, messages, tournamentParticipants } from '$lib/server/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { processMatchProgression } from '$lib/server/progression';
import { advanceWinner } from '$lib/server/tournament/TournamentManager';
import { getIO, userSockets } from '../index';

// ── Active Room Storage ───────────────────────────────────────
// roomId → GameRoom instance
const activeRooms = new Map<string, GameRoom>();

// userId → roomId (quick lookup: "is this player in a game?")
const playerRoomMap = new Map<number, string>();

// roomId → creation timestamp (for TTL cleanup)
const roomCreatedAt = new Map<string, number>();

// Cleanup interval ID (for memory management)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

// ── Room TTL Cleanup (prevent indefinite room accumulation) ──
const ROOM_TTL_MS = 3600_000; // 1 hour
const CLEANUP_INTERVAL_MS = 300_000; // Run cleanup every 5 minutes

function startCleanupInterval(): void {
	if (cleanupInterval) return; // Already running
	
	cleanupInterval = setInterval(() => {
		const now = Date.now();
		const expiredRoomIds: string[] = [];
		
		for (const [roomId, createdAt] of roomCreatedAt) {
			const age = now - createdAt;
			if (age > ROOM_TTL_MS) {
				expiredRoomIds.push(roomId);
			}
		}
		
		if (expiredRoomIds.length > 0) {
			console.log(`[RoomManager] Cleanup: Destroying ${expiredRoomIds.length} expired room(s)`);
			for (const roomId of expiredRoomIds) {
				destroyRoom(roomId);
			}
		}
	}, CLEANUP_INTERVAL_MS);
	
	console.log(`[RoomManager] Room TTL cleanup started (TTL: ${ROOM_TTL_MS/1000}s, interval: ${CLEANUP_INTERVAL_MS/1000}s)`);
}

// ── Public API ────────────────────────────────────────────────
export function getRoom(roomId: string): GameRoom | undefined {
	return activeRooms.get(roomId);
}
export function getRoomByPlayer(userId: number): GameRoom | undefined {
	const roomId = playerRoomMap.get(userId);
	return roomId ? activeRooms.get(roomId) : undefined;
}
export function isPlayerInGame(userId: number): boolean {
	return playerRoomMap.has(userId);
}

/**
 * Create a new game room and register both players.
 *
 * broadcastState and broadcastEvent are injected by the caller
 * (the socket handler) — this keeps RoomManager decoupled from Socket.IO.
 */
export function createRoom(
	roomId: string,
	player1: { userId: number; username: string },
	player2: { userId: number; username: string },
	settings: { speedPreset: string; winScore: number; powerUps?: boolean },
	broadcastState: (roomId: string, state: GameStateSnapshot) => void,
	broadcastEvent: (roomId: string, event: string, data: any) => void,
	): GameRoom {
		const room = new GameRoom({
			roomId,
			player1,
			player2,
			settings,
			onGameEnd: (result) => handleGameEnd(result),
			onCancelled: (cancelledRoomId) => destroyRoom(cancelledRoomId),
			broadcastState,
			broadcastEvent,
		});
		// Register room and both players
		activeRooms.set(roomId, room);
		playerRoomMap.set(player1.userId, roomId);
		playerRoomMap.set(player2.userId, roomId);
		
		// Track creation timestamp for TTL cleanup
		roomCreatedAt.set(roomId, Date.now());
		
		// Start cleanup interval if not already running
		startCleanupInterval();
		
		return room;
}

/** Remove a room and unregister both players */
export function destroyRoom(roomId: string): void {
	const room = activeRooms.get(roomId);
	if (!room) return;
	room.destroy();
	// Only delete playerRoomMap entries if they still point to THIS room.
	// In tournaments, advanceWinner → createRoom may have already reassigned
	// the winner to a new room — we must not delete that new mapping.
	if (playerRoomMap.get(room.player1.userId) === roomId) {
		playerRoomMap.delete(room.player1.userId);
	}
	if (playerRoomMap.get(room.player2.userId) === roomId) {
		playerRoomMap.delete(room.player2.userId);
	}
	activeRooms.delete(roomId);
	roomCreatedAt.delete(roomId); // Clean up TTL tracking
}

// ── Match Saving (called when game ends) ──────────────────────
/**
 * Save the match result to the database for BOTH players.
 * Updates: games table, user stats, XP/achievements progression.
 *
 * This runs inside a transaction so everything succeeds or fails together.
 */
async function handleGameEnd(result: GameResult): Promise<void> {
	// Clear playerRoomMap immediately so players can challenge again
	// while the async DB save is still running
	playerRoomMap.delete(result.player1.userId);
	playerRoomMap.delete(result.player2.userId);

	try {
		const finishedAt = new Date();
		const startedAt = new Date(finishedAt.getTime() - result.durationSeconds * 1000);
		await db.transaction(async (tx) => {
			// 1. Insert the game record
			const [gameRecord] = await tx.insert(games).values({
				type: 'pong',
				status: 'finished',
				game_mode: 'online',           // This is what makes it different from local/computer
				player1_id: result.player1.userId,
				player2_id: result.player2.userId,  // Real user ID, not null like local games
				player2_name: result.player2.username,
				player1_score: result.player1.score,
				player2_score: result.player2.score,
				winner_id: result.winnerId,
				winner_name: result.winnerUsername,
				winner_score: result.settings.winScore,
				speed_preset: result.settings.speedPreset,
				duration_seconds: result.durationSeconds,
				started_at: startedAt,
				finished_at: finishedAt,
				tournament_id: result.roomId.startsWith('tournament-')
					? Number(result.roomId.split('-')[1]) : null,
				tournament_round: result.roomId.startsWith('tournament-')
					? Number(result.roomId.split('-')[2].replace('r', '')) : null,
				tournament_match_index: result.roomId.startsWith('tournament-')
					? Number(result.roomId.split('-')[3].replace('m', '')) : null,
			}).returning({ id: games.id });

			// 2. Update player 1 stats (games_played, wins, losses)
			const p1Won = result.winnerId === result.player1.userId;
			await tx.update(users)
				.set({
				games_played: sql`${users.games_played} + 1`,
				wins: p1Won ? sql`${users.wins} + 1` : users.wins,
				losses: p1Won ? users.losses : sql`${users.losses} + 1`,
				updated_at: finishedAt,
				})
				.where(eq(users.id, result.player1.userId));

			// 3. Update player 2 stats
			const p2Won = result.winnerId === result.player2.userId;
			await tx.update(users)
				.set({
				games_played: sql`${users.games_played} + 1`,
				wins: p2Won ? sql`${users.wins} + 1` : users.wins,
				losses: p2Won ? users.losses : sql`${users.losses} + 1`,
				updated_at: finishedAt,
				})
				.where(eq(users.id, result.player2.userId));

			// 4. Process XP/levels/achievements for both players
			// maxDeficit is from player 1's perspective in the engine,
			// so for player 2 we compute it as the inverse deficit
			const p1MaxDeficit = result.maxDeficit;
			const p2MaxDeficit = Math.max(0, result.player1.score - result.player2.score);

			const p1Progression = await processMatchProgression(tx, result.player1.userId, {
				won: p1Won,
				player1Score: result.player1.score,
				player2Score: result.player2.score,
				winScore: result.settings.winScore,
				speedPreset: result.settings.speedPreset as 'chill' | 'normal' | 'fast',
				ballReturns: result.ballReturns,
				maxDeficit: p1MaxDeficit,
				reachedDeuce: result.reachedDeuce,
			});

			// For player 2, their score is "player1Score" from their perspective
			const p2Progression = await processMatchProgression(tx, result.player2.userId, {
				won: p2Won,
				player1Score: result.player2.score,
				player2Score: result.player1.score,
				winScore: result.settings.winScore,
				speedPreset: result.settings.speedPreset as 'chill' | 'normal' | 'fast',
				ballReturns: result.ballReturns,
				maxDeficit: p2MaxDeficit,
				reachedDeuce: result.reachedDeuce,
			});

			// Send progression results to each player via socket
			const io = getIO();
			for (const [uid, progression] of [[result.player1.userId, p1Progression], [result.player2.userId, p2Progression]] as const) {
				const sockets = userSockets.get(uid);
				if (sockets) {
					for (const sid of sockets) {
						io.to(sid).emit('game:progression', progression);
					}
				}
			}

			// Check if this was a tournament match
			if (result.roomId.startsWith('tournament-')) {
				const parts = result.roomId.split('-');
				// Format: tournament-{id}-r{round}-m{matchIndex}
				const tournamentId = Number(parts[1]);
				const round = Number(parts[2].replace('r', ''));
				const matchIndex = Number(parts[3].replace('m', ''));

				// Accumulate XP earned in this tournament for both players
				for (const [uid, progression] of [[result.player1.userId, p1Progression], [result.player2.userId, p2Progression]] as const) {
					if (progression.xpEarned > 0) {
						await tx.update(tournamentParticipants).set({
							xp_earned: sql`${tournamentParticipants.xp_earned} + ${progression.xpEarned}`,
						}).where(and(
							eq(tournamentParticipants.tournament_id, tournamentId),
							eq(tournamentParticipants.user_id, uid),
						));
					}
				}

				const winnerScore = result.player1.userId === result.winnerId
				? result.player1.score : result.player2.score;
			const loserScore = result.player1.userId === result.loserId
				? result.player1.score : result.player2.score;
			await advanceWinner(tournamentId, round, matchIndex, result.winnerId, result.loserId, winnerScore, loserScore);
			}

			const matchContent = `🏆 ${result.winnerUsername} won ${result.player1.score}-${result.player2.score}`;
			const [msgSaved] = await tx.insert(messages).values({
				sender_id: result.player1.userId,
				recipient_id: result.player2.userId,
				game_id: gameRecord.id, // from the insert returning
				type: 'system',
				content: matchContent,
			}).returning({ id: messages.id });

			// Push match result into both players' chat panels
			const msgPayload = {
				id: msgSaved.id,
				senderId: result.player1.userId,
				senderUsername: '',
				senderAvatar: null,
				recipientId: result.player2.userId,
				content: matchContent,
				createdAt: new Date().toISOString(),
				gameId: gameRecord.id,
				type: 'system',
			};
			const p1Sockets = userSockets.get(result.player1.userId);
			if (p1Sockets) for (const sid of p1Sockets) io.to(sid).emit('chat:sent', msgPayload);
			const p2Sockets = userSockets.get(result.player2.userId);
			if (p2Sockets) for (const sid of p2Sockets) io.to(sid).emit('chat:message', msgPayload);
		});
		console.log(`[GameRoom] Match saved: ${result.winnerUsername} won ${result.roomId}`);
	} catch (err) {
		console.error('[GameRoom] Failed to save match:', err);
	} finally {
		// Always clean up the room, even if DB save fails
		destroyRoom(result.roomId);
	}
}
