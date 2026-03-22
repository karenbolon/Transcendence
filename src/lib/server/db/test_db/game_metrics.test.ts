import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../index';
import { game_metrics } from '../schema';
import { eq } from 'drizzle-orm';
import { cleanDatabase, createTestUsers, createTestGame } from './test-utils';

describe('Game Metrics Schema - Integration Tests', () => {
	beforeEach(async () => {
		await cleanDatabase();
	});

	describe('CREATE operations', () => {
		it('should create a game metric with all fields', async () => {
			expect.assertions(12);

			const [user1, user2] = await createTestUsers(2);
			const game = await createTestGame(user1.id, user2.id, { status: 'finished' });

			const [metric] = await db
				.insert(game_metrics)
				.values({
					game_id: game.id,
					user_id: user1.id,
					avg_rtt: 45.5,
					p95_rtt: 120.3,
					avg_jitter: 5.2,
					p95_jitter: 18.7,
					avg_fps: 59.8,
					min_fps: 42.0,
					browser: 'Chrome/120.0',
					viewport_width: 1920,
					viewport_height: 1080,
					duration_seconds: 180
				})
				.returning();

			expect(metric.game_id).toBe(game.id);
			expect(metric.user_id).toBe(user1.id);
			expect(metric.avg_rtt).toBeCloseTo(45.5);
			expect(metric.p95_rtt).toBeCloseTo(120.3);
			expect(metric.avg_jitter).toBeCloseTo(5.2);
			expect(metric.p95_jitter).toBeCloseTo(18.7);
			expect(metric.avg_fps).toBeCloseTo(59.8);
			expect(metric.min_fps).toBeCloseTo(42.0);
			expect(metric.browser).toBe('Chrome/120.0');
			expect(metric.viewport_width).toBe(1920);
			expect(metric.viewport_height).toBe(1080);
			expect(metric.duration_seconds).toBe(180);
		});

		it('should create a game metric without optional fields', async () => {
			expect.assertions(3);

			const [user1, user2] = await createTestUsers(2);
			const game = await createTestGame(user1.id, user2.id, { status: 'active' });

			const [metric] = await db
				.insert(game_metrics)
				.values({
					game_id: game.id,
					user_id: user1.id,
					avg_rtt: 30.0,
					p95_rtt: 80.0,
					avg_jitter: 3.0,
					p95_jitter: 10.0,
					avg_fps: 60.0,
					min_fps: 55.0,
					browser: 'Firefox/121.0',
					viewport_width: 1280,
					viewport_height: 720
				})
				.returning();

			expect(metric.duration_seconds).toBeNull();
			expect(metric.created_at).toBeInstanceOf(Date);
			expect(metric.id).toBeGreaterThan(0);
		});
	});

	describe('READ operations', () => {
		it('should read game metrics by game id', async () => {
			expect.assertions(2);

			const [user1, user2] = await createTestUsers(2);
			const game = await createTestGame(user1.id, user2.id, { status: 'finished' });

			await db.insert(game_metrics).values({
				game_id: game.id,
				user_id: user1.id,
				avg_rtt: 50.0,
				p95_rtt: 100.0,
				avg_jitter: 4.0,
				p95_jitter: 12.0,
				avg_fps: 60.0,
				min_fps: 50.0,
				browser: 'Chrome/120.0',
				viewport_width: 1920,
				viewport_height: 1080
			});

			const found = await db
				.select()
				.from(game_metrics)
				.where(eq(game_metrics.game_id, game.id));

			expect(found).toHaveLength(1);
			expect(found[0].avg_rtt).toBeCloseTo(50.0);
		});
	});
});
