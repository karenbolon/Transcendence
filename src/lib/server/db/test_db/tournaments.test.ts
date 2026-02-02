import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../index';
import { tournaments, users } from '../schema';
import { eq } from 'drizzle-orm';
import { cleanDatabase, createTestUser, createTestUsers, createTestTournament } from './test-utils';

describe('Tournaments Schema - Integration Tests', () => {
	beforeEach(async () => {
		await cleanDatabase();
	});

	describe('CREATE operations', () => {
		it('should create a tournament with defaults', async () => {
			const creator = await createTestUser();

			const [tournament] = await db
				.insert(tournaments)
				.values({
					name: 'Summer Cup',
					game_type: 'pong',
					created_by: creator.id
				})
				.returning();

			expect(tournament.name).toBe('Summer Cup');
			expect(tournament.status).toBe('scheduled');
			expect(tournament.max_players).toBe(8);
			expect(tournament.winner_id).toBeNull();
			expect(tournament.created_at).toBeInstanceOf(Date);
			expect(tournament.updated_at).toBeInstanceOf(Date);
		});
	});

	describe('UPDATE operations', () => {
		it('should update tournament status and winner', async () => {
			const [creator, winner] = await createTestUsers(2);
			const tournament = await createTestTournament(creator.id);

			await db
				.update(tournaments)
				.set({ status: 'finished', winner_id: winner.id })
				.where(eq(tournaments.id, tournament.id));

			const [updated] = await db.select().from(tournaments).where(eq(tournaments.id, tournament.id));

			expect(updated.status).toBe('finished');
			expect(updated.winner_id).toBe(winner.id);
		});
	});

	describe('FOREIGN KEY constraints', () => {
		it('should prevent deleting the tournament creator (restrict)', async () => {
			const creator = await createTestUser();
			await createTestTournament(creator.id);

			await expect(db.delete(users).where(eq(users.id, creator.id))).rejects.toThrow();
		});
	});
});
