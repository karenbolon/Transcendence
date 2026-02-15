// src/lib/server/db/test_db/soft-delete.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../index';
import { users, sessions } from '../schema';
import { eq, and } from 'drizzle-orm';
import { cleanDatabase, createTestUser, createTestSession } from './test-utils';
import { isUsernameTaken, isEmailTaken } from '$lib/server/auth/db_valid';

describe('Soft Delete - Integration Tests', () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    // ══════════════════════════════════════════════════════════════════════════
    // Helper: perform a soft delete with anonymization (mirrors the API action)
    // ══════════════════════════════════════════════════════════════════════════
    async function softDeleteUser(userId: number) {
        const now = new Date();
        const anonSuffix = `deleted_${userId}_${now.getTime()}`;

        await db.transaction(async (tx) => {
            await tx
                .update(users)
                .set({
                    is_deleted: true,
                    deleted_at: now,
                    is_online: false,
                    username: anonSuffix,
                    email: `${anonSuffix}@deleted.local`
                })
                .where(eq(users.id, userId));
        });

        return { anonSuffix, deletedAt: now };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 1. Soft delete sets is_deleted and deleted_at
    // ══════════════════════════════════════════════════════════════════════════
    describe('Soft delete mechanics', () => {
        it('should set is_deleted = true and deleted_at when soft-deleted', async () => {
            const user = await createTestUser({ username: 'alice', email: 'alice@test.com' });

            const { deletedAt } = await softDeleteUser(user.id);

            const [found] = await db.select().from(users).where(eq(users.id, user.id));

            expect(found).toBeDefined();
            expect(found.is_deleted).toBe(true);
            expect(found.deleted_at).toBeInstanceOf(Date);
            expect(found.deleted_at!.getTime()).toBeCloseTo(deletedAt.getTime(), -3);
        });

        it('should anonymize username and email', async () => {
            const user = await createTestUser({ username: 'bob', email: 'bob@test.com' });

            const { anonSuffix } = await softDeleteUser(user.id);

            const [found] = await db.select().from(users).where(eq(users.id, user.id));

            expect(found.username).toBe(anonSuffix);
            expect(found.email).toBe(`${anonSuffix}@deleted.local`);
            expect(found.username).not.toBe('bob');
            expect(found.email).not.toBe('bob@test.com');
        });

        it('should set is_online to false', async () => {
            const user = await createTestUser({ is_online: true });

            await softDeleteUser(user.id);

            const [found] = await db.select().from(users).where(eq(users.id, user.id));
            expect(found.is_online).toBe(false);
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // 2. Uniqueness checks exclude soft-deleted users
    // ══════════════════════════════════════════════════════════════════════════
    describe('Uniqueness checks', () => {
        it('should not consider soft-deleted username as taken', async () => {
            const user = await createTestUser({ username: 'charlie', email: 'charlie@test.com' });

            // Before deletion: username IS taken
            expect(await isUsernameTaken('charlie')).toBe(true);

            await softDeleteUser(user.id);

            // After deletion: original username is NOT taken (it was anonymized)
            expect(await isUsernameTaken('charlie')).toBe(false);
        });

        it('should not consider soft-deleted email as taken', async () => {
            const user = await createTestUser({ username: 'diana', email: 'diana@test.com' });

            expect(await isEmailTaken('diana@test.com')).toBe(true);

            await softDeleteUser(user.id);

            expect(await isEmailTaken('diana@test.com')).toBe(false);
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // 3. Anonymization clears UNIQUE constraint conflicts
    // ══════════════════════════════════════════════════════════════════════════
    describe('Re-registration after deletion', () => {
        it('should allow re-registration with same username and email', async () => {
            const user = await createTestUser({ username: 'eve', email: 'eve@test.com' });

            await softDeleteUser(user.id);

            // Create a NEW user with the same original credentials
            const newUser = await createTestUser({ username: 'eve', email: 'eve@test.com' });

            expect(newUser.id).not.toBe(user.id);
            expect(newUser.username).toBe('eve');
            expect(newUser.email).toBe('eve@test.com');
            expect(newUser.is_deleted).toBe(false);
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // 4. Login query excludes soft-deleted users
    // ══════════════════════════════════════════════════════════════════════════
    describe('Login exclusion', () => {
        it('should not find soft-deleted user by original username', async () => {
            const user = await createTestUser({ username: 'frank', email: 'frank@test.com' });

            await softDeleteUser(user.id);

            // Simulate the login query (same as login/+page.server.ts)
            const [found] = await db
                .select()
                .from(users)
                .where(eq(users.username, 'frank'))
                .limit(1);

            // Username was anonymized, so the query by original username returns nothing
            expect(found).toBeUndefined();
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // 5. Profile query excludes soft-deleted users
    // ══════════════════════════════════════════════════════════════════════════
    describe('Profile exclusion', () => {
        it('should not find soft-deleted user in profile query', async () => {
            const user = await createTestUser({ username: 'grace', email: 'grace@test.com' });

            await softDeleteUser(user.id);

            // Simulate the profile query (same as profile/+page.server.ts)
            const result = await db
                .select()
                .from(users)
                .where(and(eq(users.id, user.id), eq(users.is_deleted, false)));

            expect(result).toHaveLength(0);
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // 6. Sessions are NOT cascade-deleted by soft delete
    // ══════════════════════════════════════════════════════════════════════════
    describe('Session persistence after soft delete', () => {
        it('should NOT cascade-delete sessions on soft delete', async () => {
            const user = await createTestUser({ username: 'henry', email: 'henry@test.com' });
            const session = await createTestSession(user.id);

            await softDeleteUser(user.id);

            // Session should still exist (soft delete is an UPDATE, not a DELETE)
            const [foundSession] = await db
                .select()
                .from(sessions)
                .where(eq(sessions.id, session.id));

            expect(foundSession).toBeDefined();
            expect(foundSession.userId).toBe(user.id);
        });
    });
});
