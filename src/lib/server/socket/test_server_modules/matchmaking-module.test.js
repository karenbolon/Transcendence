import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMatchQueue } from '../../../../../server.matchmaking.js';

describe('server.matchmaking module', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('matches compatible custom players immediately', () => {
		expect.assertions(4);
		const queue = createMatchQueue();

		const first = queue.add(1, 'alice', null, null, 's1', 'custom', {
			speedPreset: 'normal',
			winScore: 5,
			powerUps: true,
		});
		expect(first).toBeNull();

		const match = queue.add(2, 'bob', null, null, 's2', 'custom', {
			speedPreset: 'normal',
			winScore: 5,
			powerUps: true,
		});
		expect(match).not.toBeNull();
		expect(match?.player1.userId).toBe(2);
		expect(queue.size()).toBe(0);
	});

	it('allows wider matching after flexible threshold', () => {
		expect.assertions(3);
		const queue = createMatchQueue();

		queue.add(1, 'alice', null, null, 's1', 'custom', {
			speedPreset: 'chill',
			winScore: 3,
			powerUps: true,
		});

		const immediate = queue.add(2, 'bob', null, null, 's2', 'custom', {
			speedPreset: 'normal',
			winScore: 5,
			powerUps: true,
		});
		expect(immediate).toBeNull();

		queue.remove(2);
		vi.advanceTimersByTime(46000);

		const delayed = queue.add(2, 'bob', null, null, 's2', 'custom', {
			speedPreset: 'normal',
			winScore: 5,
			powerUps: true,
		});
		expect(delayed).not.toBeNull();
		expect(queue.size()).toBe(0);
	});

	it('removes stale queue entries after five minutes', () => {
		expect.assertions(3);
		const queue = createMatchQueue();

		queue.add(1, 'alice', null, null, 's1', 'quick');
		expect(queue.size()).toBe(1);

		vi.advanceTimersByTime(5 * 60 * 1000 + 1);
		const expired = queue.removeExpired();

		expect(expired).toEqual([1]);
		expect(queue.size()).toBe(0);
	});
});
