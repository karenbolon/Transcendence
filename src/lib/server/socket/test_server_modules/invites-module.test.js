import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInviteManager } from '../../../../../server.invites.js';

describe('server.invites module', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('accepts invite only for intended recipient', () => {
		expect.assertions(3);
		const invites = createInviteManager({ ttlMs: 1000 });
		const { inviteId } = invites.create({
			fromUserId: 1,
			fromUsername: 'alice',
			toUserId: 2,
			settings: { speedPreset: 'normal', winScore: 5, powerUps: true },
		});

		const rejected = invites.accept(inviteId, 3);
		expect(rejected).toBeNull();

		const accepted = invites.accept(inviteId, 2);
		expect(accepted?.fromUserId).toBe(1);
		expect(accepted?.toUserId).toBe(2);
	});

	it('expires invite and calls onExpire callback', () => {
		expect.assertions(3);
		const onExpire = vi.fn();
		const invites = createInviteManager({ ttlMs: 500 });
		const { inviteId } = invites.create({
			fromUserId: 1,
			fromUsername: 'alice',
			toUserId: 2,
			settings: { speedPreset: 'normal', winScore: 5, powerUps: true },
			onExpire,
		});

		vi.advanceTimersByTime(501);

		expect(onExpire).toHaveBeenCalledTimes(1);
		expect(onExpire).toHaveBeenCalledWith(
			inviteId,
			expect.objectContaining({ fromUserId: 1, toUserId: 2 }),
		);
		expect(invites.accept(inviteId, 2)).toBeNull();
	});

	it('cancels sender invite and returns removed invite', () => {
		expect.assertions(3);
		const invites = createInviteManager({ ttlMs: 1000 });
		invites.create({
			fromUserId: 1,
			fromUsername: 'alice',
			toUserId: 2,
			settings: { speedPreset: 'normal', winScore: 5, powerUps: true },
		});

		const cancelled = invites.cancelBySender(1);
		expect(cancelled).not.toBeNull();
		expect(cancelled?.invite.fromUserId).toBe(1);
		expect(invites.cancelBySender(1)).toBeNull();
	});
});
