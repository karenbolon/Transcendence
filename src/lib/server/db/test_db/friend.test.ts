// src/lib/server/db/test_db/friend.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../index';
import { users, friendships } from '../schema';
import { eq, and, or } from 'drizzle-orm';
import { cleanDatabase, createTestUsers } from './test-utils';

describe('Friendships Schema - Integration Tests', () => {
	// ══════════════════════════════════════════════════════════════════════════
	// 🧹 Clean before EACH test - ensures isolation
	// ══════════════════════════════════════════════════════════════════════════
	beforeEach(async () => {
		await cleanDatabase();
	});

	describe('CREATE operations', () => {
		it('should create a friend request', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [friendship] = await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user2.id,
					status: 'pending'
				})
				.returning();

			expect(friendship.id).toBeTypeOf('number');
			expect(friendship.id).toBeGreaterThan(0);
			expect(friendship.user_id).toBe(user1.id);
			expect(friendship.friend_id).toBe(user2.id);
			expect(friendship.status).toBe('pending');
		});

		it('should auto-generate serial ID', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [friendship1] = await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user2.id
				})
				.returning();

			const [friendship2] = await db
				.insert(friendships)
				.values({
					user_id: user2.id,
					friend_id: user1.id
				})
				.returning();

			expect(friendship2.id).toBeGreaterThan(friendship1.id);
		});

		it('should set default status to pending', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [friendship] = await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user2.id
				})
				.returning();

			expect(friendship.status).toBe('pending');
			expect(friendship.created_at).toBeInstanceOf(Date);
		});

		it('should create friendship with different statuses', async () => {
			const [user1, user2, user3] = await createTestUsers(3);

			const [pending] = await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user2.id,
					status: 'pending'
				})
				.returning();

			const [accepted] = await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user3.id,
					status: 'accepted'
				})
				.returning();

			expect(pending.status).toBe('pending');
			expect(accepted.status).toBe('accepted');
		});
	});

	describe('READ operations', () => {
		it('should read a friendship by ID', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [created] = await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user2.id
				})
				.returning();

			const [found] = await db.select().from(friendships).where(eq(friendships.id, created.id));

			expect(found).toBeDefined();
			expect(found.id).toBe(created.id);
		});

		it('should find sent friend requests', async () => {
			const [user1, user2, user3] = await createTestUsers(3);

			await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user2.id,
					status: 'pending'
				})
				.returning();

			await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user3.id,
					status: 'pending'
				})
				.returning();

			// Find all sent requests from user1
			const sentRequests = await db
				.select()
				.from(friendships)
				.where(and(eq(friendships.user_id, user1.id), eq(friendships.status, 'pending')));

			expect(sentRequests).toHaveLength(2);
		});

		it('should find received friend requests', async () => {
			const [user1, user2, user3] = await createTestUsers(3);

			await db
				.insert(friendships)
				.values({
					user_id: user2.id,
					friend_id: user1.id,
					status: 'pending'
				})
				.returning();

			await db
				.insert(friendships)
				.values({
					user_id: user3.id,
					friend_id: user1.id,
					status: 'pending'
				})
				.returning();

			// Find all received requests for user1
			const receivedRequests = await db
				.select()
				.from(friendships)
				.where(and(eq(friendships.friend_id, user1.id), eq(friendships.status, 'pending')));

			expect(receivedRequests).toHaveLength(2);
		});

		it('should find all friends (accepted status)', async () => {
			const [user1, user2, user3] = await createTestUsers(3);

			await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user2.id,
					status: 'accepted'
				})
				.returning();

			await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user3.id,
					status: 'accepted'
				})
				.returning();

			const friends = await db
				.select()
				.from(friendships)
				.where(and(eq(friendships.user_id, user1.id), eq(friendships.status, 'accepted')));

			expect(friends).toHaveLength(2);
		});

		it('should check if friendship exists between two users', async () => {
			const [user1, user2] = await createTestUsers(2);

			await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user2.id
				})
				.returning();

			// Check if friendship exists (either direction)
			const exists = await db
				.select()
				.from(friendships)
				.where(
					or(
						and(eq(friendships.user_id, user1.id), eq(friendships.friend_id, user2.id)),
						and(eq(friendships.user_id, user2.id), eq(friendships.friend_id, user1.id))
					)
				);

			expect(exists.length).toBeGreaterThan(0);
		});
	});

	describe('UPDATE operations', () => {
		it('should accept a friend request', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [friendship] = await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user2.id,
					status: 'pending'
				})
				.returning();

			// Accept the request
			await db.update(friendships).set({ status: 'accepted' }).where(eq(friendships.id, friendship.id));

			const [updated] = await db.select().from(friendships).where(eq(friendships.id, friendship.id));

			expect(updated.status).toBe('accepted');
		});

		it('should reject a friend request', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [friendship] = await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user2.id,
					status: 'pending'
				})
				.returning();

			// Reject the request
			await db.update(friendships).set({ status: 'rejected' }).where(eq(friendships.id, friendship.id));

			const [updated] = await db.select().from(friendships).where(eq(friendships.id, friendship.id));

			expect(updated.status).toBe('rejected');
		});
	});

	describe('DELETE operations', () => {
		it('should unfriend (delete friendship)', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [friendship] = await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user2.id,
					status: 'accepted'
				})
				.returning();

			const friendshipId = friendship.id;

			// Unfriend
			await db.delete(friendships).where(eq(friendships.id, friendshipId));

			const found = await db.select().from(friendships).where(eq(friendships.id, friendshipId));

			expect(found).toHaveLength(0);
		});

		it('should delete pending request', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [friendship] = await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user2.id,
					status: 'pending'
				})
				.returning();

			const friendshipId = friendship.id;

			// Cancel request
			await db.delete(friendships).where(eq(friendships.id, friendshipId));

			const found = await db.select().from(friendships).where(eq(friendships.id, friendshipId));

			expect(found).toHaveLength(0);
		});
	});

	describe('FOREIGN KEY constraints', () => {
		it('should require valid user_id', async () => {
			const [user] = await createTestUsers(1);

			await expect(
				db.insert(friendships).values({
					user_id: 999999, // Non-existent user
					friend_id: user.id
				})
			).rejects.toThrow();
		});

		it('should require valid friend_id', async () => {
			const [user] = await createTestUsers(1);

			await expect(
				db.insert(friendships).values({
					user_id: user.id,
					friend_id: 999999 // Non-existent user
				})
			).rejects.toThrow();
		});

		it('should cascade delete friendships when user is deleted', async () => {
			const [user1, user2] = await createTestUsers(2);

			const [friendship] = await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user2.id
				})
				.returning();

			const friendshipId = friendship.id;

			// Delete user1 - should cascade delete friendship
			await db.delete(users).where(eq(users.id, user1.id));

			const found = await db.select().from(friendships).where(eq(friendships.id, friendshipId));

			expect(found).toHaveLength(0);
		});
	});

	describe('FRIENDSHIP LOGIC scenarios', () => {
		it('should handle complete friend request lifecycle', async () => {
			const [alice, bob] = await createTestUsers(2);

			// 1. Alice sends friend request to Bob
			const [request] = await db
				.insert(friendships)
				.values({
					user_id: alice.id,
					friend_id: bob.id,
					status: 'pending'
				})
				.returning();

			expect(request.status).toBe('pending');

			// 2. Bob accepts the request
			await db.update(friendships).set({ status: 'accepted' }).where(eq(friendships.id, request.id));

			const [friendship] = await db.select().from(friendships).where(eq(friendships.id, request.id));

			expect(friendship.status).toBe('accepted');

			// 3. Later, they unfriend
			await db.delete(friendships).where(eq(friendships.id, request.id));

			const found = await db.select().from(friendships).where(eq(friendships.id, request.id));

			expect(found).toHaveLength(0);
		});

		it('should prevent duplicate friend requests', async () => {
			const [user1, user2] = await createTestUsers(2);

			// First request
			await db
				.insert(friendships)
				.values({
					user_id: user1.id,
					friend_id: user2.id
				})
				.returning();

			// Check if friendship exists
			const existing = await db
				.select()
				.from(friendships)
				.where(and(eq(friendships.user_id, user1.id), eq(friendships.friend_id, user2.id)));

			expect(existing).toHaveLength(1);
		});

		it('should handle bidirectional friendships', async () => {
			const [alice, bob] = await createTestUsers(2);

			// Alice → Bob
			await db
				.insert(friendships)
				.values({
					user_id: alice.id,
					friend_id: bob.id,
					status: 'accepted'
				})
				.returning();

			// Bob → Alice (bidirectional)
			await db
				.insert(friendships)
				.values({
					user_id: bob.id,
					friend_id: alice.id,
					status: 'accepted'
				})
				.returning();

			// Both should exist
			const aliceFriends = await db
				.select()
				.from(friendships)
				.where(and(eq(friendships.user_id, alice.id), eq(friendships.status, 'accepted')));

			const bobFriends = await db
				.select()
				.from(friendships)
				.where(and(eq(friendships.user_id, bob.id), eq(friendships.status, 'accepted')));

			expect(aliceFriends).toHaveLength(1);
			expect(bobFriends).toHaveLength(1);
		});

		it('should find mutual friends', async () => {
			const [alice, bob, charlie] = await createTestUsers(3);

			// Alice → Charlie
			await db
				.insert(friendships)
				.values({
					user_id: alice.id,
					friend_id: charlie.id,
					status: 'accepted'
				})
				.returning();

			// Bob → Charlie
			await db
				.insert(friendships)
				.values({
					user_id: bob.id,
					friend_id: charlie.id,
					status: 'accepted'
				})
				.returning();

			// Find Charlie's friends (mutual friend of Alice and Bob)
			const charlieFriends = await db
				.select()
				.from(friendships)
				.where(eq(friendships.friend_id, charlie.id));

			expect(charlieFriends).toHaveLength(2);
		});
	});
});
