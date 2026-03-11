// src/routes/api/friends/friends-api.test.ts
// Integration tests for all friend API endpoints
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/server/db';
import { friendships } from '$lib/server/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { cleanDatabase, createTestUsers } from '$lib/server/db/test_db/test-utils';

// Import endpoint handlers
import { POST as requestHandler } from '../request/+server';
import { POST as acceptHandler } from '../accept/+server';
import { POST as declineHandler } from '../decline/+server';
import { POST as cancelHandler } from '../cancel/+server';
import { POST as removeHandler } from '../remove/+server';
import { POST as blockHandler } from '../block/+server';
import { POST as unblockHandler } from '../unblock/+server';
import { GET as searchHandler } from '../search/+server';

// ══════════════════════════════════════════════════════════════════════════════
// Helper: build mock SvelteKit event objects
// ══════════════════════════════════════════════════════════════════════════════

function mockPostEvent(userId: number | null, body: Record<string, unknown>) {
	return {
		locals: userId ? { user: { id: userId } } : {},
		request: new Request('http://localhost/api/friends', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		}),
	} as any;
}

function mockGetEvent(userId: number | null, query: string) {
	return {
		locals: userId ? { user: { id: userId } } : {},
		url: new URL(`http://localhost/api/friends/search?q=${encodeURIComponent(query)}`),
	} as any;
}

/** Helper to parse JSON response */
async function parseResponse(res: Response) {
	const data = await res.json();
	return { status: res.status, data };
}

/** Helper to get friendship row between two users */
async function getFriendship(userA: number, userB: number) {
	const [row] = await db
		.select()
		.from(friendships)
		.where(
			or(
				and(eq(friendships.user_id, userA), eq(friendships.friend_id, userB)),
				and(eq(friendships.user_id, userB), eq(friendships.friend_id, userA))
			)
		);
	return row ?? null;
}

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('Friends API Endpoints', () => {
	let alice: { id: number };
	let bob: { id: number };
	let charlie: { id: number };

	beforeEach(async () => {
		await cleanDatabase();
		const users = await createTestUsers(3);
		alice = users[0];
		bob = users[1];
		charlie = users[2];
	});

	// ════════════════════════════════════════════════════════════════════════
	// AUTH CHECKS (shared pattern across all POST endpoints)
	// ════════════════════════════════════════════════════════════════════════

	describe('authentication', () => {
		it('should return 401 when not authenticated (request)', async () => {
			const res = await requestHandler(mockPostEvent(null, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(401);
		});

		it('should return 401 when not authenticated (accept)', async () => {
			const res = await acceptHandler(mockPostEvent(null, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(401);
		});

		it('should return 401 when not authenticated (search)', async () => {
			const res = await searchHandler(mockGetEvent(null, 'test'));
			const { status } = await parseResponse(res);
			expect(status).toBe(401);
		});
	});

	// ════════════════════════════════════════════════════════════════════════
	// POST /api/friends/request
	// ════════════════════════════════════════════════════════════════════════

	describe('POST /api/friends/request', () => {
		it('should send a friend request', async () => {
			const res = await requestHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status, data } = await parseResponse(res);

			expect(status).toBe(200);
			expect(data.status).toBe('pending');

			const row = await getFriendship(alice.id, bob.id);
			expect(row).not.toBeNull();
			expect(row!.status).toBe('pending');
			expect(row!.user_id).toBe(alice.id);
			expect(row!.friend_id).toBe(bob.id);
		});

		it('should reject self-request', async () => {
			const res = await requestHandler(mockPostEvent(alice.id, { friendId: alice.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(400);
		});

		it('should return 404 for non-existent user', async () => {
			const res = await requestHandler(mockPostEvent(alice.id, { friendId: 99999 }));
			const { status } = await parseResponse(res);
			expect(status).toBe(404);
		});

		it('should return 400 for missing friendId', async () => {
			const res = await requestHandler(mockPostEvent(alice.id, {}));
			const { status } = await parseResponse(res);
			expect(status).toBe(400);
		});

		it('should return 409 if already friends', async () => {
			await db.insert(friendships).values({
				user_id: alice.id,
				friend_id: bob.id,
				status: 'accepted',
			});

			const res = await requestHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(409);
		});

		it('should return 409 if request already sent', async () => {
			await db.insert(friendships).values({
				user_id: alice.id,
				friend_id: bob.id,
				status: 'pending',
			});

			const res = await requestHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(409);
		});

		it('should auto-accept if they already sent us a request', async () => {
			// Bob sent Alice a request first
			await db.insert(friendships).values({
				user_id: bob.id,
				friend_id: alice.id,
				status: 'pending',
			});

			// Alice requests Bob — should auto-accept
			const res = await requestHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status, data } = await parseResponse(res);

			expect(status).toBe(200);
			expect(data.status).toBe('accepted');

			const row = await getFriendship(alice.id, bob.id);
			expect(row!.status).toBe('accepted');
		});

		it('should return 403 if blocked by target (without revealing block)', async () => {
			await db.insert(friendships).values({
				user_id: bob.id,
				friend_id: alice.id,
				status: 'blocked',
			});

			const res = await requestHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status, data } = await parseResponse(res);
			expect(status).toBe(403);
			expect(data.error).toBe('Unable to send request');
		});

		it('should return 400 if we blocked the target', async () => {
			await db.insert(friendships).values({
				user_id: alice.id,
				friend_id: bob.id,
				status: 'blocked',
			});

			const res = await requestHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status, data } = await parseResponse(res);
			expect(status).toBe(400);
			expect(data.error).toBe('You have this user blocked');
		});
	});

	// ════════════════════════════════════════════════════════════════════════
	// POST /api/friends/accept
	// ════════════════════════════════════════════════════════════════════════

	describe('POST /api/friends/accept', () => {
		it('should accept a pending request', async () => {
			// Bob sent Alice a request
			await db.insert(friendships).values({
				user_id: bob.id,
				friend_id: alice.id,
				status: 'pending',
			});

			// Alice accepts
			const res = await acceptHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(200);

			const row = await getFriendship(alice.id, bob.id);
			expect(row!.status).toBe('accepted');
		});

		it('should not allow sender to accept their own request', async () => {
			// Alice sent Bob a request
			await db.insert(friendships).values({
				user_id: alice.id,
				friend_id: bob.id,
				status: 'pending',
			});

			// Alice tries to accept (she's the sender, not receiver)
			const res = await acceptHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(404);
		});

		it('should return 404 if no pending request exists', async () => {
			const res = await acceptHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(404);
		});

		it('should not accept already-accepted friendship', async () => {
			await db.insert(friendships).values({
				user_id: bob.id,
				friend_id: alice.id,
				status: 'accepted',
			});

			const res = await acceptHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(404);
		});
	});

	// ════════════════════════════════════════════════════════════════════════
	// POST /api/friends/decline
	// ════════════════════════════════════════════════════════════════════════

	describe('POST /api/friends/decline', () => {
		it('should decline and delete the request', async () => {
			await db.insert(friendships).values({
				user_id: bob.id,
				friend_id: alice.id,
				status: 'pending',
			});

			const res = await declineHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(200);

			// Row should be deleted
			const row = await getFriendship(alice.id, bob.id);
			expect(row).toBeNull();
		});

		it('should not allow sender to decline their own request', async () => {
			await db.insert(friendships).values({
				user_id: alice.id,
				friend_id: bob.id,
				status: 'pending',
			});

			const res = await declineHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(404);
		});

		it('should allow re-requesting after decline', async () => {
			// Bob sends, Alice declines
			await db.insert(friendships).values({
				user_id: bob.id,
				friend_id: alice.id,
				status: 'pending',
			});
			await declineHandler(mockPostEvent(alice.id, { friendId: bob.id }));

			// Bob can send again
			const res = await requestHandler(mockPostEvent(bob.id, { friendId: alice.id }));
			const { status, data } = await parseResponse(res);
			expect(status).toBe(200);
			expect(data.status).toBe('pending');
		});
	});

	// ════════════════════════════════════════════════════════════════════════
	// POST /api/friends/cancel
	// ════════════════════════════════════════════════════════════════════════

	describe('POST /api/friends/cancel', () => {
		it('should cancel a sent request', async () => {
			await db.insert(friendships).values({
				user_id: alice.id,
				friend_id: bob.id,
				status: 'pending',
			});

			const res = await cancelHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(200);

			const row = await getFriendship(alice.id, bob.id);
			expect(row).toBeNull();
		});

		it('should not allow receiver to cancel', async () => {
			// Bob sent Alice a request
			await db.insert(friendships).values({
				user_id: bob.id,
				friend_id: alice.id,
				status: 'pending',
			});

			// Alice tries to cancel (she's the receiver)
			const res = await cancelHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(404);
		});

		it('should return 404 if no pending request', async () => {
			const res = await cancelHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(404);
		});
	});

	// ════════════════════════════════════════════════════════════════════════
	// POST /api/friends/remove
	// ════════════════════════════════════════════════════════════════════════

	describe('POST /api/friends/remove', () => {
		it('should remove an accepted friendship (as sender)', async () => {
			await db.insert(friendships).values({
				user_id: alice.id,
				friend_id: bob.id,
				status: 'accepted',
			});

			const res = await removeHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(200);

			const row = await getFriendship(alice.id, bob.id);
			expect(row).toBeNull();
		});

		it('should remove an accepted friendship (as receiver)', async () => {
			await db.insert(friendships).values({
				user_id: bob.id,
				friend_id: alice.id,
				status: 'accepted',
			});

			// Alice can unfriend even though Bob was the original sender
			const res = await removeHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(200);

			const row = await getFriendship(alice.id, bob.id);
			expect(row).toBeNull();
		});

		it('should not remove a pending request', async () => {
			await db.insert(friendships).values({
				user_id: alice.id,
				friend_id: bob.id,
				status: 'pending',
			});

			const res = await removeHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(404);
		});

		it('should return 404 if no friendship exists', async () => {
			const res = await removeHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(404);
		});
	});

	// ════════════════════════════════════════════════════════════════════════
	// POST /api/friends/block
	// ════════════════════════════════════════════════════════════════════════

	describe('POST /api/friends/block', () => {
		it('should reject blocking a user with no existing relationship', async () => {
			const res = await blockHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(400);
		});

		it('should block and unfriend an existing friend', async () => {
			await db.insert(friendships).values({
				user_id: bob.id,
				friend_id: alice.id,
				status: 'accepted',
			});

			const res = await blockHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(200);

			const row = await getFriendship(alice.id, bob.id);
			expect(row!.status).toBe('blocked');
			// Blocker is always stored as user_id
			expect(row!.user_id).toBe(alice.id);
			expect(row!.friend_id).toBe(bob.id);
		});

		it('should reject self-block', async () => {
			const res = await blockHandler(mockPostEvent(alice.id, { friendId: alice.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(400);
		});

		it('should return 409 if already blocked by us', async () => {
			await db.insert(friendships).values({
				user_id: alice.id,
				friend_id: bob.id,
				status: 'blocked',
			});

			const res = await blockHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(409);
		});

		it('should return 404 for non-existent user', async () => {
			const res = await blockHandler(mockPostEvent(alice.id, { friendId: 99999 }));
			const { status } = await parseResponse(res);
			expect(status).toBe(404);
		});

		it('should only allow blocking accepted friends', async () => {
			// Pending request — can't block
			await db.insert(friendships).values({
				user_id: bob.id,
				friend_id: alice.id,
				status: 'pending',
			});

			const res = await blockHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(400);
		});

		it('should block an accepted friend', async () => {
			await db.insert(friendships).values({
				user_id: alice.id,
				friend_id: bob.id,
				status: 'accepted',
			});

			const res = await blockHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(200);

			const row = await getFriendship(alice.id, bob.id);
			expect(row!.status).toBe('blocked');
			expect(row!.user_id).toBe(alice.id);
		});
	});

	// ════════════════════════════════════════════════════════════════════════
	// POST /api/friends/unblock
	// ════════════════════════════════════════════════════════════════════════

	describe('POST /api/friends/unblock', () => {
		it('should unblock and restore friendship', async () => {
			await db.insert(friendships).values({
				user_id: alice.id,
				friend_id: bob.id,
				status: 'blocked',
			});

			const res = await unblockHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(200);

			// Row should be restored to accepted
			const row = await getFriendship(alice.id, bob.id);
			expect(row).not.toBeNull();
			expect(row!.status).toBe('accepted');
		});

		it('should not allow the blocked user to unblock themselves', async () => {
			// Alice blocked Bob — only Alice can unblock
			await db.insert(friendships).values({
				user_id: alice.id,
				friend_id: bob.id,
				status: 'blocked',
			});

			const res = await unblockHandler(mockPostEvent(bob.id, { friendId: alice.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(404);
		});

		it('should return 404 if no block exists', async () => {
			const res = await unblockHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			const { status } = await parseResponse(res);
			expect(status).toBe(404);
		});

		it('should restore friendship after unblock (no re-request needed)', async () => {
			await db.insert(friendships).values({
				user_id: alice.id,
				friend_id: bob.id,
				status: 'blocked',
			});

			// Alice unblocks Bob
			await unblockHandler(mockPostEvent(alice.id, { friendId: bob.id }));

			// They should be friends again
			const row = await getFriendship(alice.id, bob.id);
			expect(row).not.toBeNull();
			expect(row!.status).toBe('accepted');
		});
	});

	// ════════════════════════════════════════════════════════════════════════
	// GET /api/friends/search
	// ════════════════════════════════════════════════════════════════════════

	describe('GET /api/friends/search', () => {
		it('should return empty for short query', async () => {
			const res = await searchHandler(mockGetEvent(alice.id, 'a'));
			const { status, data } = await parseResponse(res);
			expect(status).toBe(200);
			expect(data.results).toEqual([]);
		});

		it('should find users by username', async () => {
			const res = await searchHandler(mockGetEvent(alice.id, 'user_'));
			const { status, data } = await parseResponse(res);
			expect(status).toBe(200);
			// Should find bob and charlie (not alice herself)
			expect(data.results.length).toBe(2);
		});

		it('should not include the searching user in results', async () => {
			const res = await searchHandler(mockGetEvent(alice.id, 'user_'));
			const { data } = await parseResponse(res);
			const ids = data.results.map((r: any) => r.id);
			expect(ids).not.toContain(alice.id);
		});

		it('should include relationship status for friends', async () => {
			await db.insert(friendships).values({
				user_id: alice.id,
				friend_id: bob.id,
				status: 'accepted',
			});

			const res = await searchHandler(mockGetEvent(alice.id, 'user_'));
			const { data } = await parseResponse(res);

			const bobResult = data.results.find((r: any) => r.id === bob.id);
			expect(bobResult.relationship).toBe('accepted');

			const charlieResult = data.results.find((r: any) => r.id === charlie.id);
			expect(charlieResult.relationship).toBeNull();
		});

		it('should return empty results for no match', async () => {
			const res = await searchHandler(mockGetEvent(alice.id, 'zzzznonexistent'));
			const { data } = await parseResponse(res);
			expect(data.results).toEqual([]);
		});
	});

	// ════════════════════════════════════════════════════════════════════════
	// Full lifecycle tests
	// ════════════════════════════════════════════════════════════════════════

	describe('full lifecycle', () => {
		it('request → accept → remove → re-request', async () => {
			// Alice sends request
			let res = await requestHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			expect((await parseResponse(res)).status).toBe(200);

			// Bob accepts
			res = await acceptHandler(mockPostEvent(bob.id, { friendId: alice.id }));
			expect((await parseResponse(res)).status).toBe(200);

			let row = await getFriendship(alice.id, bob.id);
			expect(row!.status).toBe('accepted');

			// Alice removes
			res = await removeHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			expect((await parseResponse(res)).status).toBe(200);

			row = await getFriendship(alice.id, bob.id);
			expect(row).toBeNull();

			// Alice can re-request
			res = await requestHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			expect((await parseResponse(res)).data.status).toBe('pending');
		});

		it('request → decline → re-request → accept', async () => {
			// Alice sends, Bob declines
			await requestHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			await declineHandler(mockPostEvent(bob.id, { friendId: alice.id }));

			// Alice sends again
			let res = await requestHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			expect((await parseResponse(res)).data.status).toBe('pending');

			// Bob accepts
			res = await acceptHandler(mockPostEvent(bob.id, { friendId: alice.id }));
			expect((await parseResponse(res)).status).toBe(200);

			const row = await getFriendship(alice.id, bob.id);
			expect(row!.status).toBe('accepted');
		});

		it('accept → block → unblock → friends again', async () => {
			// Alice sends request, Bob accepts
			await requestHandler(mockPostEvent(alice.id, { friendId: bob.id }));
			await acceptHandler(mockPostEvent(bob.id, { friendId: alice.id }));

			// Bob blocks Alice
			await blockHandler(mockPostEvent(bob.id, { friendId: alice.id }));
			let row = await getFriendship(bob.id, alice.id);
			expect(row!.status).toBe('blocked');

			// Bob unblocks — friendship restored
			await unblockHandler(mockPostEvent(bob.id, { friendId: alice.id }));
			row = await getFriendship(bob.id, alice.id);
			expect(row!.status).toBe('accepted');
		});

		it('mutual request → auto-accept', async () => {
			// Alice requests Bob
			await requestHandler(mockPostEvent(alice.id, { friendId: bob.id }));

			// Bob requests Alice → auto-accept
			const res = await requestHandler(mockPostEvent(bob.id, { friendId: alice.id }));
			const { data } = await parseResponse(res);
			expect(data.status).toBe('accepted');

			const row = await getFriendship(alice.id, bob.id);
			expect(row!.status).toBe('accepted');
		});
	});
});
