// src/lib/server/db/test_db/game.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../index';
import { users, games } from '../schema';
import { eq, or } from 'drizzle-orm';
import { cleanDatabase, createTestUsers } from './test-utils';

describe('Games Schema - Integration Tests', () => {
	// ══════════════════════════════════════════════════════════════════════════
	// 🧹 Clean before EACH test - ensures isolation
	// ══════════════════════════════════════════════════════════════════════════
	beforeEach(async () => {
		await cleanDatabase();
	});

	describe('CREATE operations', () => {
		it('should create a game with required fields', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [game] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					player2_id: user2.id,
					status: 'waiting'
				})
				.returning();

			expect(game.id).toBeTypeOf('number');
			expect(game.id).toBeGreaterThan(0);
			expect(game.type).toBe('pong');
			expect(game.status).toBe('waiting');
			expect(game.player1_id).toBe(user1.id);
			expect(game.player2_id).toBe(user2.id);
		});

		it('should auto-generate serial ID', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [game1] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					player2_id: user2.id
				})
				.returning();

			const [game2] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					player2_id: user2.id
				})
				.returning();

			expect(game2.id).toBeGreaterThan(game1.id);
		});

		it('should set default values correctly', async () => {
			const [user1] = await createTestUsers(1);

			const [game] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id
				})
				.returning();

			// Check defaults
			expect(game.status).toBe('waiting');
			expect(game.player1_score).toBe(0);
			expect(game.player2_score).toBe(0);
			expect(game.player2_id).toBeNull();
			expect(game.winner_id).toBeNull();
			expect(game.started_at).toBeNull();
			expect(game.finished_at).toBeNull();
			expect(game.created_at).toBeInstanceOf(Date);
			expect(game.updated_at).toBeInstanceOf(Date);
		});

		it('should create game with different types', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [pongGame] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					player2_id: user2.id
				})
				.returning();

			const [chessGame] = await db
				.insert(games)
				.values({
					type: 'chess',
					player1_id: user1.id,
					player2_id: user2.id
				})
				.returning();

			expect(pongGame.type).toBe('pong');
			expect(chessGame.type).toBe('chess');
		});

		it('should create game with only player1 (waiting for player2)', async () => {
			const [user1] = await createTestUsers(1);

			const [game] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					status: 'waiting'
				})
				.returning();

			expect(game.player1_id).toBe(user1.id);
			expect(game.player2_id).toBeNull();
			expect(game.status).toBe('waiting');
		});
	});

	describe('READ operations', () => {
		it('should read a game by ID', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [created] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					player2_id: user2.id
				})
				.returning();

			const [found] = await db.select().from(games).where(eq(games.id, created.id));

			expect(found).toBeDefined();
			expect(found.id).toBe(created.id);
		});

		it('should find games by player', async () => {
			const [user1, user2] = await createTestUsers(2);

			await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					player2_id: user2.id
				})
				.returning();

			await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user2.id,
					player2_id: user1.id
				})
				.returning();

			// Find all games where user1 is a player
			const user1Games = await db
				.select()
				.from(games)
				.where(or(eq(games.player1_id, user1.id), eq(games.player2_id, user1.id)));

			expect(user1Games).toHaveLength(2);
		});

		it('should find games by status', async () => {
			const [user1, user2] = await createTestUsers(2);

			await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					status: 'waiting'
				})
				.returning();

			const [activeGame] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					player2_id: user2.id,
					status: 'active'
				})
				.returning();

			const activeGames = await db.select().from(games).where(eq(games.status, 'active'));

			expect(activeGames).toHaveLength(1);
			expect(activeGames[0].id).toBe(activeGame.id);
		});

		it('should find games by type', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [pongGame] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					player2_id: user2.id
				})
				.returning();

			const pongGames = await db.select().from(games).where(eq(games.type, 'pong'));

			expect(pongGames.length).toBeGreaterThan(0);
			expect(pongGames.some((g) => g.id === pongGame.id)).toBe(true);
		});
	});

	describe('UPDATE operations', () => {
		it('should update game status', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [game] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					player2_id: user2.id,
					status: 'waiting'
				})
				.returning();

			// Start the game
			await db
				.update(games)
				.set({ status: 'active', started_at: new Date() })
				.where(eq(games.id, game.id));

			const [updated] = await db.select().from(games).where(eq(games.id, game.id));

			expect(updated.status).toBe('active');
			expect(updated.started_at).toBeInstanceOf(Date);
		});

		it('should update game scores', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [game] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					player2_id: user2.id,
					status: 'active'
				})
				.returning();

			// Update scores
			await db
				.update(games)
				.set({
					player1_score: 5,
					player2_score: 3
				})
				.where(eq(games.id, game.id));

			const [updated] = await db.select().from(games).where(eq(games.id, game.id));

			expect(updated.player1_score).toBe(5);
			expect(updated.player2_score).toBe(3);
		});

		it('should finish a game with winner', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [game] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					player2_id: user2.id,
					status: 'active'
				})
				.returning();

			// Finish game
			const finishTime = new Date();
			await db
				.update(games)
				.set({
					status: 'finished',
					player1_score: 10,
					player2_score: 8,
					winner_id: user1.id,
					finished_at: finishTime
				})
				.where(eq(games.id, game.id));

			const [updated] = await db.select().from(games).where(eq(games.id, game.id));

			expect(updated.status).toBe('finished');
			expect(updated.winner_id).toBe(user1.id);
			expect(updated.finished_at).toBeInstanceOf(Date);
		});

		it('should add player2 to waiting game', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [game] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					status: 'waiting'
				})
				.returning();

			expect(game.player2_id).toBeNull();

			// Player 2 joins
			await db
				.update(games)
				.set({
					player2_id: user2.id,
					status: 'active',
					started_at: new Date()
				})
				.where(eq(games.id, game.id));

			const [updated] = await db.select().from(games).where(eq(games.id, game.id));

			expect(updated.player2_id).toBe(user2.id);
			expect(updated.status).toBe('active');
		});
	});

	describe('DELETE operations', () => {
		it('should delete a game', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [game] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					player2_id: user2.id
				})
				.returning();

			const gameId = game.id;

			await db.delete(games).where(eq(games.id, gameId));

			const found = await db.select().from(games).where(eq(games.id, gameId));

			expect(found).toHaveLength(0);
		});
	});

	describe('FOREIGN KEY constraints', () => {
		it('should require valid player1_id', async () => {
			await expect(
				db.insert(games).values({
					type: 'pong',
					player1_id: 999999, // Non-existent user
					status: 'waiting'
				})
			).rejects.toThrow();
		});

		it('should allow null player2_id', async () => {
			const [user1] = await createTestUsers(1);

			const [game] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					player2_id: null
				})
				.returning();

			expect(game.player2_id).toBeNull();
		});

		it('should prevent deleting user with active games (restrict)', async () => {
			const [user1, user2] = await createTestUsers(2);

			await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					player2_id: user2.id
				})
				.returning();

			// Try to delete user1 who has a game
			await expect(db.delete(users).where(eq(users.id, user1.id))).rejects.toThrow();
		});
	});

	describe('GAME LOGIC scenarios', () => {
		it('should track a complete game lifecycle', async () => {
			const [user1, user2] = await createTestUsers(2);

			// 1. Player 1 creates a waiting game
			const [game] = await db
				.insert(games)
				.values({
					type: 'pong',
					player1_id: user1.id,
					status: 'waiting'
				})
				.returning();

			expect(game.status).toBe('waiting');
			expect(game.player2_id).toBeNull();

			// 2. Player 2 joins
			await db
				.update(games)
				.set({
					player2_id: user2.id,
					status: 'active',
					started_at: new Date()
				})
				.where(eq(games.id, game.id));

			let [updated] = await db.select().from(games).where(eq(games.id, game.id));

			expect(updated.status).toBe('active');
			expect(updated.player2_id).toBe(user2.id);

			// 3. Game progresses - update scores
			await db
				.update(games)
				.set({
					player1_score: 10,
					player2_score: 7
				})
				.where(eq(games.id, game.id));

			// 4. Game finishes
			await db
				.update(games)
				.set({
					status: 'finished',
					winner_id: user1.id,
					finished_at: new Date()
				})
				.where(eq(games.id, game.id));

			[updated] = await db.select().from(games).where(eq(games.id, game.id));

			expect(updated.status).toBe('finished');
			expect(updated.winner_id).toBe(user1.id);
			expect(updated.player1_score).toBe(10);
			expect(updated.player2_score).toBe(7);
			expect(updated.finished_at).toBeInstanceOf(Date);
		});

		it('should handle draw (no winner)', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [game] = await db
				.insert(games)
				.values({
					type: 'chess',
					player1_id: user1.id,
					player2_id: user2.id,
					status: 'active'
				})
				.returning();

			// Finish with draw
			await db
				.update(games)
				.set({
					status: 'finished',
					player1_score: 5,
					player2_score: 5,
					winner_id: null, // Draw!
					finished_at: new Date()
				})
				.where(eq(games.id, game.id));

			const [updated] = await db.select().from(games).where(eq(games.id, game.id));

			expect(updated.status).toBe('finished');
			expect(updated.winner_id).toBeNull();
			expect(updated.player1_score).toBe(updated.player2_score);
		});
	});
});