// src/lib/server/db/test_db/schema.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../index';
import { users, friendships, games, sessions } from '../schema';
import { eq } from 'drizzle-orm';

// ══════════════════════════════════════════════════════════════════════════════
// 🧹 Clean database helper
// ══════════════════════════════════════════════════════════════════════════════
async function cleanDatabase() {
	await db.delete(sessions).execute().catch(() => {});
	await db.delete(friendships).execute().catch(() => {});
	await db.delete(games).execute().catch(() => {});
	await db.delete(users).execute().catch(() => {});
}

describe('Users Schema - Integration Tests', () => {
	// ══════════════════════════════════════════════════════════════════════════
	// 🧹 Clean before EACH test - ensures isolation
	// ══════════════════════════════════════════════════════════════════════════
	beforeEach(async () => {
		await cleanDatabase();
	});

	describe('CREATE operations', () => {
		it('should create a user with all required fields', async () => {
			const [user] = await db
				.insert(users)
				.values({
					username: 'alice',
					name: 'Alice Smith',
					email: 'alice@example.com',
					password_hash: 'hashed_password_123'
				})
				.returning();

			// Verify all fields
			expect(user.id).toBeTypeOf('number');
			expect(user.id).toBeGreaterThan(0);
			expect(user.username).toBe('alice');
			expect(user.name).toBe('Alice Smith');
			expect(user.email).toBe('alice@example.com');
			expect(user.password_hash).toBe('hashed_password_123');
		});

		it('should auto-generate serial ID', async () => {
			const [user1] = await db
				.insert(users)
				.values({
					username: 'user1',
					name: 'User One',
					email: 'user1@example.com',
					password_hash: 'hash1'
				})
				.returning();

			const [user2] = await db
				.insert(users)
				.values({
					username: 'user2',
					name: 'User Two',
					email: 'user2@example.com',
					password_hash: 'hash2'
				})
				.returning();

			// IDs should be different and user2 should have higher ID
			expect(user2.id).toBeGreaterThan(user1.id);
		});

		it('should set default values correctly', async () => {
			const [user] = await db
				.insert(users)
				.values({
					username: 'bob',
					name: 'Bob Jones',
					email: 'bob@example.com',
					password_hash: 'hashed'
				})
				.returning();

			// Check default values
			expect(user.is_online).toBe(false);
			expect(user.avatar_url).toBeNull();
			expect(user.bio).toBeNull();
			expect(user.created_at).toBeInstanceOf(Date);
			expect(user.updated_at).toBeInstanceOf(Date);
		});

		it('should create user with optional fields', async () => {
			const [user] = await db
				.insert(users)
				.values({
					username: 'charlie',
					name: 'Charlie Brown',
					email: 'charlie@example.com',
					password_hash: 'hashed',
					avatar_url: 'https://example.com/avatar.png',
					bio: 'I love playing Pong!',
					is_online: true
				})
				.returning();

			expect(user.avatar_url).toBe('https://example.com/avatar.png');
			expect(user.bio).toBe('I love playing Pong!');
			expect(user.is_online).toBe(true);
		});
	});

	describe('READ operations', () => {
		it('should read a user by ID', async () => {
			const [created] = await db
				.insert(users)
				.values({
					username: 'reader',
					name: 'Read User',
					email: 'read@example.com',
					password_hash: 'hashed'
				})
				.returning();

			const [found] = await db.select().from(users).where(eq(users.id, created.id));

			expect(found).toBeDefined();
			expect(found.id).toBe(created.id);
			expect(found.username).toBe('reader');
		});

		it('should read a user by email', async () => {
			const [created] = await db
				.insert(users)
				.values({
					username: 'emailtest',
					name: 'Email Test',
					email: 'emailtest@example.com',
					password_hash: 'hashed'
				})
				.returning();

			const [found] = await db
				.select()
				.from(users)
				.where(eq(users.email, 'emailtest@example.com'));

			expect(found).toBeDefined();
			expect(found.id).toBe(created.id);
		});

		it('should return empty array for non-existent user', async () => {
			const found = await db.select().from(users).where(eq(users.id, 999999));

			expect(found).toHaveLength(0);
		});
	});

	describe('UPDATE operations', () => {
		it('should update user name', async () => {
			const [user] = await db
				.insert(users)
				.values({
					username: 'updatetest',
					name: 'Original Name',
					email: 'update@example.com',
					password_hash: 'hashed'
				})
				.returning();

			await db.update(users).set({ name: 'Updated Name' }).where(eq(users.id, user.id));

			const [updated] = await db.select().from(users).where(eq(users.id, user.id));

			expect(updated.name).toBe('Updated Name');
		});

		it('should update multiple fields', async () => {
			const [user] = await db
				.insert(users)
				.values({
					username: 'multiupdate',
					name: 'Old Name',
					email: 'old@example.com',
					password_hash: 'hashed'
				})
				.returning();

			await db
				.update(users)
				.set({
					name: 'New Name',
					bio: 'New bio here',
					is_online: true
				})
				.where(eq(users.id, user.id));

			const [updated] = await db.select().from(users).where(eq(users.id, user.id));

			expect(updated.name).toBe('New Name');
			expect(updated.bio).toBe('New bio here');
			expect(updated.is_online).toBe(true);
		});
	});

	describe('DELETE operations', () => {
		it('should delete a user', async () => {
			const [user] = await db
				.insert(users)
				.values({
					username: 'deletetest',
					name: 'Delete Test',
					email: 'delete@example.com',
					password_hash: 'hashed'
				})
				.returning();

			const userId = user.id;

			await db.delete(users).where(eq(users.id, userId));

			const found = await db.select().from(users).where(eq(users.id, userId));

			expect(found).toHaveLength(0);
		});
	});

	describe('CONSTRAINTS - Unique username', () => {
		it('should enforce unique username constraint', async () => {
			await db
				.insert(users)
				.values({
					username: 'uniqueuser',
					name: 'User One',
					email: 'user1@example.com',
					password_hash: 'hash1'
				})
				.returning();

			// Try to create user with duplicate username
			await expect(
				db.insert(users).values({
					username: 'uniqueuser', // DUPLICATE!
					name: 'User Two',
					email: 'user2@example.com',
					password_hash: 'hash2'
				})
			).rejects.toThrow();
		});
	});

	describe('CONSTRAINTS - Unique email', () => {
		it('should enforce unique email constraint', async () => {
			await db
				.insert(users)
				.values({
					username: 'email1',
					name: 'User One',
					email: 'same@example.com',
					password_hash: 'hash1'
				})
				.returning();

			// Try to create user with duplicate email
			await expect(
				db.insert(users).values({
					username: 'email2',
					name: 'User Two',
					email: 'same@example.com', // DUPLICATE!
					password_hash: 'hash2'
				})
			).rejects.toThrow();
		});
	});

	describe('CONSTRAINTS - Not null fields', () => {
		it('should require all mandatory fields', async () => {
			// Missing password_hash should fail
			await expect(
				db.insert(users).values({
					username: 'test',
					name: 'Test',
					email: 'test@example.com'
					// password_hash is missing!
				} as any)
			).rejects.toThrow();
		});
	});

	describe('CONSTRAINTS - Field lengths', () => {
		it('should accept username at max length (50 chars)', async () => {
			const maxUsername = 'a'.repeat(50);

			const [user] = await db
				.insert(users)
				.values({
					username: maxUsername,
					name: 'Test User',
					email: 'maxusername@example.com',
					password_hash: 'hashed'
				})
				.returning();

			expect(user.username).toHaveLength(50);
		});

		it('should reject username over max length (51+ chars)', async () => {
			const tooLongUsername = 'a'.repeat(51);

			await expect(
				db.insert(users).values({
					username: tooLongUsername,
					name: 'Test',
					email: 'toolong@example.com',
					password_hash: 'hashed'
				})
			).rejects.toThrow();
		});
	});

	describe('DATA INTEGRITY', () => {
		it('should handle special characters in bio', async () => {
			const [user] = await db
				.insert(users)
				.values({
					username: 'special',
					name: 'Special User',
					email: 'special@example.com',
					password_hash: 'hash',
					bio: 'Bio with émojis 🎮🏓 and special chars!'
				})
				.returning();

			expect(user.bio).toBe('Bio with émojis 🎮🏓 and special chars!');
		});

		it('should handle empty strings vs null', async () => {
			const [user] = await db
				.insert(users)
				.values({
					username: 'emptytest',
					name: 'Empty Test',
					email: 'empty@example.com',
					password_hash: 'hashed',
					bio: '' // Empty string, not null
				})
				.returning();

			expect(user.bio).toBe('');
			expect(user.bio).not.toBeNull();
		});
	});
});