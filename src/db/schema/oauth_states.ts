import { pgTable, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';

/**
 * OAuth State Storage
 * 
 * Stores temporary OAuth state values for CSRF protection during OAuth flows.
 * Each state is unique to a single OAuth request and expires after a short time.
 */
export const oauthStates = pgTable('oauth_states', {
	state: varchar('state', { length: 128 }).primaryKey(),
	used: boolean('used').default(false).notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});
