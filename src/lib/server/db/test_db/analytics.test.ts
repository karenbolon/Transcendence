import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../index';
import { analytics } from '../schema';
import { eq } from 'drizzle-orm';
import {
	cleanDatabase,
	createTestUsers,
	createTestGame,
	createTestTournament,
	createTestAnalytics
} from './test-utils';

describe('Analytics Schema - Integration Tests', () => {
	beforeEach(async () => {
		await cleanDatabase();
	});

	describe('CREATE operations', () => {
		it('should create an analytics event with references', async () => {
			const [user1, user2] = await createTestUsers(2);
			const game = await createTestGame(user1.id, user2.id, { status: 'finished' });
			const tournament = await createTestTournament(user1.id);

			const [event] = await db
				.insert(analytics)
				.values({
					user_id: user1.id,
					game_id: game.id,
					tournament_id: tournament.id,
					event_type: 'match_end',
					event_value: 1,
					metadata: 'test metadata'
				})
				.returning();

			expect(event.user_id).toBe(user1.id);
			expect(event.game_id).toBe(game.id);
			expect(event.tournament_id).toBe(tournament.id);
			expect(event.event_type).toBe('match_end');
			expect(event.event_value).toBe(1);
			expect(event.created_at).toBeInstanceOf(Date);
		});
	});

	describe('READ operations', () => {
		it('should read analytics by user', async () => {
			const [user] = await createTestUsers(1);
			await createTestAnalytics({ user_id: user.id, event_type: 'login' });

			const found = await db.select().from(analytics).where(eq(analytics.user_id, user.id));

			expect(found).toHaveLength(1);
			expect(found[0].event_type).toBe('login');
		});
	});
});
