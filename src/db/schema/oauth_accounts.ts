import { pgTable, serial, integer, varchar, text, timestamp, check, index, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

/**
 * OAuth Accounts Table
 * 
 * Stores OAuth provider account information linked to users.
 * Each user can have multiple OAuth accounts from different providers.
 * All tokens are encrypted using AES-256-GCM before storage.
 */
export const oauthAccounts = pgTable(
	'oauth_accounts',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
		provider: varchar('provider', { length: 50 }).notNull(), // e.g., 'google', 'github', '42'
		providerUserId: varchar('provider_user_id', { length: 255 }).notNull(), // External provider's user ID
		accessToken: text('access_token').notNull(), // AES-256-GCM encrypted
		refreshToken: text('refresh_token'), // Optional, also encrypted
		expiresAt: timestamp('expires_at'), // When the access token expires
		scopes: varchar('scopes', { length: 500 }), // Comma-separated list of granted scopes
		providerMetadata: text('provider_metadata'), // JSON: raw data from provider (email, name, etc)
		lastUsedAt: timestamp('last_used_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(t) => ({
		// Ensure one provider per user (user can have max one account per provider)
		uniqueProviderAccount: unique('unique_provider_account').on(t.userId, t.provider),
		
		// Index for fast lookups by provider and provider_user_id
		providerLookup: unique('provider_lookup').on(t.provider, t.providerUserId),
		
		// Index for queries by user_id
		userIdIndex: index('oauth_accounts_user_id_idx').on(t.userId),
		
		// Index for provider lookups
		providerIndex: index('oauth_accounts_provider_idx').on(t.provider),
		
		// Ensure provider and provider_user_id are not empty
		checkProviderNotEmpty: check('provider_not_empty', sql`${t.provider} != ''`),
		checkProviderUserIdNotEmpty: check('provider_user_id_not_empty', sql`${t.providerUserId} != ''`),
	})
);
