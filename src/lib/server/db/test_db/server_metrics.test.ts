import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../index';
import { server_metrics } from '../schema';
import { eq } from 'drizzle-orm';
import { cleanDatabase } from './test-utils';

describe('Server Metrics Schema - Integration Tests', () => {
	beforeEach(async () => {
		await cleanDatabase();
	});

	describe('CREATE operations', () => {
		it('should create a server metric with attributes', async () => {
			expect.assertions(5);

			const [metric] = await db
				.insert(server_metrics)
				.values({
					metric_name: 'http.request.duration',
					metric_value: 125.5,
					metric_type: 'histogram',
					attributes: { method: 'GET', route: '/api/games', status: '200' }
				})
				.returning();

			expect(metric.metric_name).toBe('http.request.duration');
			expect(metric.metric_value).toBeCloseTo(125.5);
			expect(metric.metric_type).toBe('histogram');
			expect(metric.attributes).toEqual({ method: 'GET', route: '/api/games', status: '200' });
			expect(metric.recorded_at).toBeInstanceOf(Date);
		});

		it('should create a server metric without attributes', async () => {
			expect.assertions(3);

			const [metric] = await db
				.insert(server_metrics)
				.values({
					metric_name: 'socket.connections.active',
					metric_value: 42,
					metric_type: 'gauge'
				})
				.returning();

			expect(metric.metric_name).toBe('socket.connections.active');
			expect(metric.metric_value).toBeCloseTo(42);
			expect(metric.attributes).toBeNull();
		});
	});

	describe('READ operations', () => {
		it('should read server metrics by name', async () => {
			expect.assertions(2);

			await db.insert(server_metrics).values([
				{
					metric_name: 'cpu.usage',
					metric_value: 65.3,
					metric_type: 'gauge'
				},
				{
					metric_name: 'memory.usage',
					metric_value: 78.1,
					metric_type: 'gauge'
				}
			]);

			const found = await db
				.select()
				.from(server_metrics)
				.where(eq(server_metrics.metric_name, 'cpu.usage'));

			expect(found).toHaveLength(1);
			expect(found[0].metric_value).toBeCloseTo(65.3);
		});
	});
});
