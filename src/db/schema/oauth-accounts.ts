/**
 * OAuth Accounts Schema
 * 
 * Stores encrypted OAuth tokens from third-party providers (GitHub, 42 Intra, etc.)
 * - Tokens encrypted at rest using AES-256-GCM
 * - Composite primary key (provider, provider_user_id) prevents duplicates
 * - Foreign key to users ensures referential integrity
 */

import {
	pgTable,
	text,
	integer,
	timestamp,
	primaryKey,
	foreignKey,
	index
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const oauthAccounts = pgTable(
	'oauth_accounts',
	{
		// Provider identifier (github, 42, discord, etc.)
		provider: text('provider').notNull(),
		
		// User ID from the OAuth provider
		providerUserId: text('provider_user_id').notNull(),
		
		// Local user ID (foreign key to users table)
		userId: integer('user_id').notNull(),
		
		// ENCRYPTED access token (AES-256-GCM)
		accessToken: text('access_token').notNull(),
		
		// ENCRYPTED refresh token (can be null if provider doesn't support)
		refreshToken: text('refresh_token'),
		
		// When the access token expires
		expiresAt: timestamp('expires_at', { withTimezone: true }),
		
		// Scope permissions granted by user
		scope: text('scope'),
		
		// When the account was linked
		linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
		
		// Last time tokens were refreshed
		lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true }),
		
		// For detecting if account needs re-authentication
		isValid: text('is_valid').notNull().default('true'),
	},
	(t) => ({
		// Composite primary key: one account per provider per provider_user_id
		pk: primaryKey({ columns: [t.provider, t.providerUserId] }),
		
		// Foreign key to users table - cascade delete
		userFk: foreignKey({
			columns: [t.userId],
			foreignColumns: [users.id]
		}).onDelete('cascade'),
		
		// Indexes for common queries
		userIdx: index('oauth_accounts_user_id_idx').on(t.userId),
		providerIdx: index('oauth_accounts_provider_idx').on(t.provider),
		expiryIdx: index('oauth_accounts_expires_at_idx').on(t.expiresAt),
	})
);

export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type NewOAuthAccount = typeof oauthAccounts.$inferInsert;
