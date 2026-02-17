// src/lib/server/db/test_db/oauth-accounts.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../db';
import { users, oauthAccounts } from '../../../../db/schema';
import { eq, and } from 'drizzle-orm';

describe('OAuth Accounts Schema', () => {
	let testUser: typeof users.$inferSelect;

	beforeEach(async () => {
		// Clean up test data
		await db.delete(oauthAccounts);
		await db.delete(users);

		// Create test user
		const [user] = await db.insert(users).values({
			username: 'testuser',
			name: 'Test User',
			email: 'test@example.com',
			password_hash: null // OAuth-only user
		}).returning();

		testUser = user;
	});

	describe('Schema Structure', () => {
		it('should create oauth_accounts table with correct columns', async () => {
			const [account] = await db.insert(oauthAccounts).values({
				provider: '42',
				providerUserId: '12345',
				userId: testUser.id,
				accessToken: 'encrypted_access_token',
				refreshToken: 'encrypted_refresh_token',
				expiresAt: new Date(Date.now() + 3600 * 1000)
			}).returning();

			expect(account).toBeDefined();
			expect(account.provider).toBe('42');
			expect(account.providerUserId).toBe('12345');
			expect(account.userId).toBe(testUser.id);
			expect(account.accessToken).toBe('encrypted_access_token');
			expect(account.refreshToken).toBe('encrypted_refresh_token');
			expect(account.expiresAt).toBeInstanceOf(Date);
			expect(account.createdAt).toBeInstanceOf(Date);
			expect(account.updatedAt).toBeInstanceOf(Date);
		});

		it('should have composite primary key (provider, providerUserId)', async () => {
			// First insert should succeed
			await db.insert(oauthAccounts).values({
				provider: '42',
				providerUserId: '12345',
				userId: testUser.id
			});

			// Second insert with same provider + providerUserId should fail
			await expect(
				db.insert(oauthAccounts).values({
					provider: '42',
					providerUserId: '12345',
					userId: testUser.id
				})
			).rejects.toThrow();
		});

		it('should allow same providerUserId with different provider', async () => {
			// Same user ID but different providers
			await db.insert(oauthAccounts).values({
				provider: '42',
				providerUserId: '12345',
				userId: testUser.id
			});

			await db.insert(oauthAccounts).values({
				provider: 'github',
				providerUserId: '12345',
				userId: testUser.id
			});

			const accounts = await db.select().from(oauthAccounts);
			expect(accounts).toHaveLength(2);
		});
	});

	describe('Foreign Key Constraints', () => {
		it('should cascade delete when user is deleted', async () => {
			// Create OAuth account
			await db.insert(oauthAccounts).values({
				provider: '42',
				providerUserId: '12345',
				userId: testUser.id
			});

			// Verify account exists
			let accounts = await db.select().from(oauthAccounts);
			expect(accounts).toHaveLength(1);

			// Delete user
			await db.delete(users).where(eq(users.id, testUser.id));

			// Verify OAuth account was cascade deleted
			accounts = await db.select().from(oauthAccounts);
			expect(accounts).toHaveLength(0);
		});

		it('should reject OAuth account with non-existent userId', async () => {
			await expect(
				db.insert(oauthAccounts).values({
					provider: '42',
					providerUserId: '12345',
					userId: 99999 // Non-existent user
				})
			).rejects.toThrow();
		});
	});

	describe('Multiple OAuth Accounts', () => {
		it('should allow user to link multiple OAuth providers', async () => {
			// Link 42 Intra
			await db.insert(oauthAccounts).values({
				provider: '42',
				providerUserId: '12345',
				userId: testUser.id
			});

			// Link GitHub
			await db.insert(oauthAccounts).values({
				provider: 'github',
				providerUserId: '67890',
				userId: testUser.id
			});

			// Link Google
			await db.insert(oauthAccounts).values({
				provider: 'google',
				providerUserId: 'google-id-123',
				userId: testUser.id
			});

			const accounts = await db.select().from(oauthAccounts)
				.where(eq(oauthAccounts.userId, testUser.id));

			expect(accounts).toHaveLength(3);
			expect(accounts.map(a => a.provider).sort()).toEqual(['42', 'github', 'google']);
		});
	});

	describe('Queries', () => {
		beforeEach(async () => {
			// Set up multiple OAuth accounts
			await db.insert(oauthAccounts).values([
				{
					provider: '42',
					providerUserId: '12345',
					userId: testUser.id
				},
				{
					provider: 'github',
					providerUserId: '67890',
					userId: testUser.id
				}
			]);
		});

		it('should find OAuth account by provider and providerUserId', async () => {
			const [account] = await db.select().from(oauthAccounts)
				.where(
					and(
						eq(oauthAccounts.provider, '42'),
						eq(oauthAccounts.providerUserId, '12345')
					)
				);

			expect(account).toBeDefined();
			expect(account.provider).toBe('42');
			expect(account.userId).toBe(testUser.id);
		});

		it('should find all OAuth accounts for a user', async () => {
			const accounts = await db.select().from(oauthAccounts)
				.where(eq(oauthAccounts.userId, testUser.id));

			expect(accounts).toHaveLength(2);
		});

		it('should update OAuth tokens', async () => {
			const newAccessToken = 'new_encrypted_access_token';
			const newExpiresAt = new Date(Date.now() + 7200 * 1000);

			await db.update(oauthAccounts)
				.set({
					accessToken: newAccessToken,
					expiresAt: newExpiresAt,
					updatedAt: new Date()
				})
				.where(
					and(
						eq(oauthAccounts.provider, '42'),
						eq(oauthAccounts.providerUserId, '12345')
					)
				);

			const [account] = await db.select().from(oauthAccounts)
				.where(
					and(
						eq(oauthAccounts.provider, '42'),
						eq(oauthAccounts.providerUserId, '12345')
					)
				);

			expect(account.accessToken).toBe(newAccessToken);
			expect(account.expiresAt?.getTime()).toBe(newExpiresAt.getTime());
		});

		it('should delete OAuth account (unlink)', async () => {
			await db.delete(oauthAccounts)
				.where(
					and(
						eq(oauthAccounts.provider, 'github'),
						eq(oauthAccounts.providerUserId, '67890')
					)
				);

			const accounts = await db.select().from(oauthAccounts)
				.where(eq(oauthAccounts.userId, testUser.id));

			expect(accounts).toHaveLength(1);
			expect(accounts[0].provider).toBe('42');
		});
	});

	describe('Users Schema Updates', () => {
		it('should allow creating user without password (OAuth-only)', async () => {
			const [oauthUser] = await db.insert(users).values({
				username: 'oauth_user',
				name: 'OAuth User',
				email: 'oauth@example.com',
				password_hash: null // ✅ Should work now
			}).returning();

			expect(oauthUser).toBeDefined();
			expect(oauthUser.password_hash).toBeNull();
		});

		it('should allow creating user with password (traditional auth)', async () => {
			const [traditionalUser] = await db.insert(users).values({
				username: 'traditional_user',
				name: 'Traditional User',
				email: 'traditional@example.com',
				password_hash: 'hashed_password_here'
			}).returning();

			expect(traditionalUser).toBeDefined();
			expect(traditionalUser.password_hash).toBe('hashed_password_here');
		});
	});
});
