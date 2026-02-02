import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../index';
import { sessions, users } from '../schema';
import { eq } from 'drizzle-orm';
import { cleanDatabase, createTestUser, createTestSession } from './test-utils';

describe('Sessions Schema - Integration Tests', () => {
	beforeEach(async () => {
		await cleanDatabase();
	});

	describe('CREATE operations', () => {
		it('should create a session with required fields', async () => {
			const user = await createTestUser();
			const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

			const [session] = await db
				.insert(sessions)
				.values({
					id: 'session_1',
					userId: user.id,
					expiresAt
				})
				.returning();

			expect(session.id).toBe('session_1');
			expect(session.userId).toBe(user.id);
			expect(session.expiresAt).toBeInstanceOf(Date);
		});
	});

	describe('READ operations', () => {
		it('should read a session by ID', async () => {
			const user = await createTestUser();
			const session = await createTestSession(user.id);

			const [found] = await db.select().from(sessions).where(eq(sessions.id, session.id));

			expect(found).toBeDefined();
			expect(found.id).toBe(session.id);
		});
	});

	describe('DELETE operations', () => {
		it('should delete a session', async () => {
			const user = await createTestUser();
			const session = await createTestSession(user.id);

			await db.delete(sessions).where(eq(sessions.id, session.id));

			const found = await db.select().from(sessions).where(eq(sessions.id, session.id));

			expect(found).toHaveLength(0);
		});
	});

	describe('FOREIGN KEY constraints', () => {
		it('should cascade delete sessions when user is deleted', async () => {
			const user = await createTestUser();
			const session = await createTestSession(user.id);

			await db.delete(users).where(eq(users.id, user.id));

			const found = await db.select().from(sessions).where(eq(sessions.id, session.id));

			expect(found).toHaveLength(0);
		});
	});
});
