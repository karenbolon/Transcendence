// src/lib/server/auth/lucia.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { lucia } from '../lucia';
import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { cleanDatabase, createTestUser } from '$lib/server/db/test_db/test-utils';

describe('Lucia Auth Setup', () => {
	// ══════════════════════════════════════════════════════════════════════════
	// 🧹 Clean before EACH test - ensures isolation
	// ══════════════════════════════════════════════════════════════════════════
	beforeEach(async () => {
		await cleanDatabase();
	});

	it('should initialize lucia correctly', () => {
		// Check that lucia exists
		expect(lucia).toBeDefined();
		expect(typeof lucia.createSession).toBe('function');
		expect(typeof lucia.validateSession).toBe('function');
		expect(typeof lucia.invalidateSession).toBe('function');
	});

	it('should create a session with lucia', async () => {
		// Create a fresh user for this test
		const user = await createTestUser();

		// Create a session using lucia
		const session = await lucia.createSession(String(user.id), {});

		expect(session).toBeDefined();
		expect(session.id).toBeDefined();
		expect(session.userId).toBe(String(user.id));
		expect(session.expiresAt).toBeInstanceOf(Date);

		console.log('✅ Session created:', {
			id: session.id.substring(0, 10) + '...',
			userId: session.userId,
			expiresAt: session.expiresAt
		});
	});

	it('should validate the session', async () => {
		// Create fresh user and session for this test
		const user = await createTestUser();
		const session = await lucia.createSession(String(user.id), {});

		// Validate the session we just created
		const result = await lucia.validateSession(session.id);

		expect(result.session).toBeDefined();
		expect(result.user).toBeDefined();
		expect(result.session?.id).toBe(session.id);
		expect(result.user?.id).toBe(user.id);
		expect(result.user?.username).toContain('user_');

		console.log('✅ Session validated:', {
			sessionId: result.session?.id.substring(0, 10) + '...',
			userId: result.user?.id,
			username: result.user?.username
		});
	});

	it('should have correct user attributes', async () => {
		// Create fresh user and session for this test
		const user = await createTestUser();
		const session = await lucia.createSession(String(user.id), {});

		const result = await lucia.validateSession(session.id);

		// Check that getUserAttributes is working
		expect(result.user?.username).toBeDefined();
		expect(result.user?.email).toBeDefined();
		expect(result.user?.name).toBeDefined();
		// password_hash should NOT be exposed via getUserAttributes
		// @ts-expect-error - password_hash should NOT be on the user object
		expect(result.user?.password_hash).toBeUndefined();

		console.log('✅ User attributes:', {
			username: result.user?.username,
			email: result.user?.email,
			name: result.user?.name,
			// @ts-expect-error - checking it doesn't exist
			passwordHashExposed: result.user?.password_hash !== undefined ? '❌ EXPOSED!' : '✅ Hidden'
		});
	});

	it('should invalidate the session', async () => {
		// Create fresh user and session for this test
		const user = await createTestUser();
		const session = await lucia.createSession(String(user.id), {});

		// Invalidate (delete) the session
		await lucia.invalidateSession(session.id);

		// Try to validate the now-deleted session
		const result = await lucia.validateSession(session.id);

		expect(result.session).toBeNull();
		expect(result.user).toBeNull();

		console.log('✅ Session invalidated successfully');
	});

	it('should handle multiple sessions for same user', async () => {
		const user = await createTestUser();

		// Create multiple sessions
		const session1 = await lucia.createSession(String(user.id), {});
		const session2 = await lucia.createSession(String(user.id), {});

		// Both should be valid
		const result1 = await lucia.validateSession(session1.id);
		const result2 = await lucia.validateSession(session2.id);

		expect(result1.session).toBeDefined();
		expect(result2.session).toBeDefined();
		expect(result1.session?.id).not.toBe(result2.session?.id);

		// Invalidate one, other should still work
		await lucia.invalidateSession(session1.id);

		const afterInvalidate1 = await lucia.validateSession(session1.id);
		const afterInvalidate2 = await lucia.validateSession(session2.id);

		expect(afterInvalidate1.session).toBeNull();
		expect(afterInvalidate2.session).toBeDefined();
	});

	it('should cascade delete sessions when user is deleted', async () => {
		const user = await createTestUser();
		const session = await lucia.createSession(String(user.id), {});

		// Verify session exists
		const beforeDelete = await lucia.validateSession(session.id);
		expect(beforeDelete.session).toBeDefined();

		// Delete user
		await db.delete(users).where(eq(users.id, user.id));

		// Session should be gone (cascade delete)
		const afterDelete = await lucia.validateSession(session.id);
		expect(afterDelete.session).toBeNull();

		console.log('✅ Sessions cascade deleted with user');
	});
});