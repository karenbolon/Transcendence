// src/db/schema/oauth-accounts.ts
import { pgTable, text, timestamp, primaryKey, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * OAuth accounts table
 * Links external OAuth provider accounts to users
 * Supports multiple OAuth providers per user (account linking)
 */
export const oauthAccounts = pgTable('oauth_accounts', {
  // Composite primary key: provider + providerUserId
  provider: text('provider').notNull(), // '42', 'github', 'google'
  providerUserId: text('provider_user_id').notNull(), // OAuth ID from provider
  
  // Foreign key to users table
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  
  // TODO: OAuth tokens are currently stored as PLAIN TEXT - SECURITY RISK!
  // These MUST be encrypted before production using AES-256-GCM
  // Use @oslojs/crypto for encryption/decryption
  // Example:
  //   import { encryptString, decryptString } from '@oslojs/crypto/aes';
  //   const encrypted = await encryptString(token, SECRET_KEY);
  //   const decrypted = await decryptString(encrypted, SECRET_KEY);
  accessToken: text('access_token'), // TODO: ENCRYPT - Currently plain text!
  refreshToken: text('refresh_token'), // TODO: ENCRYPT - Currently plain text!
  expiresAt: timestamp('expires_at'), // Token expiration timestamp
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Composite primary key ensures one OAuth account per provider per user
  pk: primaryKey({ columns: [table.provider, table.providerUserId] })
}));

// Type exports for TypeScript
export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type NewOAuthAccount = typeof oauthAccounts.$inferInsert;
