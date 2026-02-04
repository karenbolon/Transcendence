// src/lib/server/auth/db-validation.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
	isUsernameTaken,
	isEmailTaken,
	isUsernameAvailable,
	isEmailAvailable,
	validateRegistrationUniqueness
} from '../db_valid';
import { db } from '$lib/server/db';
import { users, sessions, games, friendships } from '$lib/server/db/schema';

// ══════════════════════════════════════════════════════════════════════════════
// 🧹 Database cleanup helper
// ══════════════════════════════════════════════════════════════════════════════
async function cleanDatabase() {
	await db.delete(sessions).execute().catch(() => {});
	await db.delete(friendships).execute().catch(() => {});
	await db.delete(games).execute().catch(() => {});
	await db.delete(users).execute().catch(() => {});
}

// ══════════════════════════════════════════════════════════════════════════════
// 👤 Helper to create a test user
// ══════════════════════════════════════════════════════════════════════════════
async function createTestUser(overrides: { username?: string; email?: string } = {}) {
	const timestamp = Date.now();
	const [user] = await db
		.insert(users)
		.values({
			username: overrides.username ?? `testuser_${timestamp}`,
			name: 'Test User',
			email: overrides.email ?? `test_${timestamp}@example.com`,
			password_hash: 'hashed_password'
		})
		.returning();
	return user;
}

describe('Database Validation', () => {
	// Clean before each test for isolation
	beforeEach(async () => {
		await cleanDatabase();
	});

	// ══════════════════════════════════════════════════════════════════════════
	// 🔤 isUsernameTaken
	// ══════════════════════════════════════════════════════════════════════════
	describe('isUsernameTaken', () => {
		it('should return false for non-existent username', async () => {
			const result = await isUsernameTaken('nonexistent');
			expect(result).toBe(false);
		});

		it('should return true for existing username', async () => {
			await createTestUser({ username: 'alice' });

			const result = await isUsernameTaken('alice');
			expect(result).toBe(true);
		});

		it('should be case-sensitive', async () => {
			await createTestUser({ username: 'Alice' });

			// Depending on your DB collation, this might differ
			// PostgreSQL is case-sensitive by default
			expect(await isUsernameTaken('Alice')).toBe(true);
			expect(await isUsernameTaken('alice')).toBe(false);
			expect(await isUsernameTaken('ALICE')).toBe(false);
		});
	});

	// ══════════════════════════════════════════════════════════════════════════
	// 📧 isEmailTaken
	// ══════════════════════════════════════════════════════════════════════════
	describe('isEmailTaken', () => {
		it('should return false for non-existent email', async () => {
			const result = await isEmailTaken('nonexistent@example.com');
			expect(result).toBe(false);
		});

		it('should return true for existing email', async () => {
			await createTestUser({ email: 'alice@example.com' });

			const result = await isEmailTaken('alice@example.com');
			expect(result).toBe(true);
		});

		it('should be case-sensitive for email', async () => {
			await createTestUser({ email: 'Alice@Example.com' });

			// PostgreSQL is case-sensitive by default
			expect(await isEmailTaken('Alice@Example.com')).toBe(true);
			expect(await isEmailTaken('alice@example.com')).toBe(false);
		});
	});

	// ══════════════════════════════════════════════════════════════════════════
	// ✅ isUsernameAvailable / isEmailAvailable
	// ══════════════════════════════════════════════════════════════════════════
	describe('isUsernameAvailable', () => {
		it('should return true for available username', async () => {
			const result = await isUsernameAvailable('newuser');
			expect(result).toBe(true);
		});

		it('should return false for taken username', async () => {
			await createTestUser({ username: 'takenuser' });

			const result = await isUsernameAvailable('takenuser');
			expect(result).toBe(false);
		});
	});

	describe('isEmailAvailable', () => {
		it('should return true for available email', async () => {
			const result = await isEmailAvailable('new@example.com');
			expect(result).toBe(true);
		});

		it('should return false for taken email', async () => {
			await createTestUser({ email: 'taken@example.com' });

			const result = await isEmailAvailable('taken@example.com');
			expect(result).toBe(false);
		});
	});

	// ══════════════════════════════════════════════════════════════════════════
	// 📝 validateRegistrationUniqueness
	// ══════════════════════════════════════════════════════════════════════════
	describe('validateRegistrationUniqueness', () => {
		it('should succeed when both username and email are available', async () => {
			const result = await validateRegistrationUniqueness({
				username: 'newuser',
				email: 'new@example.com'
			});

			expect(result.success).toBe(true);
			expect(result.errors).toBeUndefined();
		});

		it('should fail when username is taken', async () => {
			await createTestUser({ username: 'existinguser' });

			const result = await validateRegistrationUniqueness({
				username: 'existinguser',
				email: 'new@example.com'
			});

			expect(result.success).toBe(false);
			expect(result.errors?.username).toBe('Username is already taken');
			expect(result.errors?.email).toBeUndefined();
		});

		it('should fail when email is taken', async () => {
			await createTestUser({ email: 'existing@example.com' });

			const result = await validateRegistrationUniqueness({
				username: 'newuser',
				email: 'existing@example.com'
			});

			expect(result.success).toBe(false);
			expect(result.errors?.email).toBe('Email is already registered');
			expect(result.errors?.username).toBeUndefined();
		});

		it('should fail with both errors when both are taken', async () => {
			await createTestUser({ username: 'takenuser', email: 'taken@example.com' });

			const result = await validateRegistrationUniqueness({
				username: 'takenuser',
				email: 'taken@example.com'
			});

			expect(result.success).toBe(false);
			expect(result.errors?.username).toBe('Username is already taken');
			expect(result.errors?.email).toBe('Email is already registered');
		});

		it('should handle checking against different users', async () => {
			// Create two different users
			await createTestUser({ username: 'user1', email: 'user1@example.com' });
			await createTestUser({ username: 'user2', email: 'user2@example.com' });

			// Try to register with user1's username and user2's email
			const result = await validateRegistrationUniqueness({
				username: 'user1',
				email: 'user2@example.com'
			});

			expect(result.success).toBe(false);
			expect(result.errors?.username).toBe('Username is already taken');
			expect(result.errors?.email).toBe('Email is already registered');
		});
	});

	// ══════════════════════════════════════════════════════════════════════════
	// 🌍 Real-world registration flow
	// ══════════════════════════════════════════════════════════════════════════
	describe('Real-world registration flow', () => {
		it('should allow first user to register', async () => {
			const result = await validateRegistrationUniqueness({
				username: 'firstuser',
				email: 'first@example.com'
			});

			expect(result.success).toBe(true);
		});

		it('should prevent duplicate registration', async () => {
			// First registration succeeds
			await createTestUser({ username: 'alice', email: 'alice@example.com' });

			// Second attempt with same credentials fails
			const result = await validateRegistrationUniqueness({
				username: 'alice',
				email: 'alice@example.com'
			});

			expect(result.success).toBe(false);
		});

		it('should allow same username after user deletion', async () => {
			// Create and then delete a user
			const user = await createTestUser({ username: 'deleteduser' });
			await db.delete(users).execute();

			// Now the username should be available again
			const result = await validateRegistrationUniqueness({
				username: 'deleteduser',
				email: 'new@example.com'
			});

			expect(result.success).toBe(true);
		});
	});
});