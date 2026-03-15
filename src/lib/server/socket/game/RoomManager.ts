import { GameRoom } from './GameRoom';
import type { GameResult, GameStateSnapshot } from '$lib/types/game';
import { db } from '$lib/server/db';
import { games, users } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { processMatchProgression } from '$lib/server/progression';

// ── Active Room Storage ───────────────────────────────────────
// roomId → GameRoom instance
const activeRooms = new Map<string, GameRoom>();

// userId → roomId (quick lookup: "is this player in a game?")
const playerRoomMap = new Map<number, string>();

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
	settings: { speedPreset: string; winScore: number },
	broadcastState: (roomId: string, state: GameStateSnapshot) => void,
	broadcastEvent: (roomId: string, event: string, data: any) => void,
	): GameRoom {
		const room = new GameRoom({
			roomId,
			player1,
			player2,
			settings,
			onGameEnd: (result) => handleGameEnd(result),
			broadcastState,
			broadcastEvent,
		});
		// Register room and both players
		activeRooms.set(roomId, room);
		playerRoomMap.set(player1.userId, roomId);
		playerRoomMap.set(player2.userId, roomId);
		return room;
}

/** Remove a room and unregister both players */
export function destroyRoom(roomId: string): void {
	const room = activeRooms.get(roomId);
	if (!room) return;
	room.destroy();
	playerRoomMap.delete(room.player1.userId);
	playerRoomMap.delete(room.player2.userId);
	activeRooms.delete(roomId);
}

// ── Match Saving (called when game ends) ──────────────────────
/**
 * Save the match result to the database for BOTH players.
 * Updates: games table, user stats, XP/achievements progression.
 *
 * This runs inside a transaction so everything succeeds or fails together.
 */
async function handleGameEnd(result: GameResult): Promise<void> {
	try {
		const finishedAt = new Date();
		const startedAt = new Date(finishedAt.getTime() - result.durationSeconds * 1000);
		await db.transaction(async (tx) => {
			// 1. Insert the game record
			await tx.insert(games).values({
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
			}).returning();

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
			// TODO: Track ballReturns, maxDeficit, reachedDeuce in GameRoom
			// to enable online achievements. For now, hardcoded to 0/false.
			await processMatchProgression(tx, result.player1.userId, {
				won: p1Won,
				player1Score: result.player1.score,
				player2Score: result.player2.score,
				winScore: result.settings.winScore,
				speedPreset: result.settings.speedPreset as 'chill' | 'normal' | 'fast',
				ballReturns: 0,
				maxDeficit: 0,
				reachedDeuce: false,
			});

			// For player 2, their score is "player1Score" from their perspective
			await processMatchProgression(tx, result.player2.userId, {
				won: p2Won,
				player1Score: result.player2.score,
				player2Score: result.player1.score,
				winScore: result.settings.winScore,
				speedPreset: result.settings.speedPreset as 'chill' | 'normal' | 'fast',
				ballReturns: 0,
				maxDeficit: 0,
				reachedDeuce: false,
			});
		});
		console.log(`[GameRoom] Match saved: ${result.winnerUsername} won ${result.roomId}`);
	} catch (err) {
		console.error('[GameRoom] Failed to save match:', err);
	} finally {
		// Always clean up the room, even if DB save fails
		destroyRoom(result.roomId);
	}
}
