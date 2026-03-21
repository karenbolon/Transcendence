/**
 * OAuth Utilities Module
 * 
 * Provides functions for managing OAuth accounts and tokens with encrypted storage.
 */

import { db } from '$lib/server/db';
import { oauthAccounts, users, oauthStates } from '$lib/server/db/schema';
import { encryptToken, decryptToken } from './token-encryption';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export interface StoredOAuthToken {
	provider: string;
	providerUserId: string;
	userId: number;
	accessToken: string;
	refreshToken?: string;
	expiresAt?: Date;
	scopes?: string[];
}

export interface OAuthProviderInfo {
	provider: string;
	providerUserId: string;
	email?: string;
	name?: string;
	avatar?: string;
	rawMetadata?: Record<string, unknown>;
}

/**
 * Stores an OAuth account for a user
 * 
 * @param userId - The local user ID
 * @param provider - OAuth provider name (e.g., 'google', 'github', '42')
 * @param providerUserId - External user ID from the provider
 * @param accessToken - OAuth access token (will be encrypted)
 * @param refreshToken - Optional OAuth refresh token (will be encrypted)
 * @param expiresAt - Optional token expiration time
 * @param scopes - Optional array of granted scopes
 * @param metadata - Optional provider metadata (email, name, avatar, etc)
 * @returns {Promise<void>}
 */
export async function storeOAuthAccount(
	userId: number,
	provider: string,
	providerUserId: string,
	accessToken: string,
	refreshToken?: string,
	expiresAt?: Date,
	scopes?: string[],
	metadata?: Record<string, unknown>
): Promise<void> {
	const encryptedAccessToken = await encryptToken(accessToken);
	const encryptedRefreshToken = refreshToken ? await encryptToken(refreshToken) : null;

	// Check if account exists
	const existingAccount = await db
		.select()
		.from(oauthAccounts)
		.where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)))
		.limit(1);

	if (existingAccount.length > 0) {
		// Update existing account
		await db
			.update(oauthAccounts)
			.set({
				accessToken: encryptedAccessToken,
				refreshToken: encryptedRefreshToken,
				expiresAt: expiresAt,
				scopes: scopes ? scopes.join(',') : null,
				providerMetadata: metadata ? JSON.stringify(metadata) : null,
				updatedAt: new Date(),
			})
			.where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)));
	} else {
		// Insert new account
		await db.insert(oauthAccounts).values({
			userId,
			provider,
			providerUserId,
			accessToken: encryptedAccessToken,
			refreshToken: encryptedRefreshToken,
			expiresAt: expiresAt,
			scopes: scopes ? scopes.join(',') : null,
			providerMetadata: metadata ? JSON.stringify(metadata) : null,
		});
	}
}

/**
 * Retrieves and decrypts an OAuth account
 * 
 * @param userId - The local user ID
 * @param provider - OAuth provider name
 * @returns {Promise<StoredOAuthToken | null>} Decrypted token info or null if not found
 */
export async function getOAuthAccount(userId: number, provider: string): Promise<StoredOAuthToken | null> {
	const account = await db
		.select()
		.from(oauthAccounts)
		.where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)))
		.limit(1);

	if (account.length === 0) {
		return null;
	}

	const row = account[0];

	return {
		provider: row.provider,
		providerUserId: row.providerUserId,
		userId: row.userId,
		accessToken: await decryptToken(row.accessToken),
		refreshToken: row.refreshToken ? await decryptToken(row.refreshToken) : undefined,
		expiresAt: row.expiresAt || undefined,
		scopes: row.scopes ? row.scopes.split(',') : undefined,
	};
}

/**
 * Finds a user by OAuth provider and provider user ID
 * 
 * @param provider - OAuth provider name
 * @param providerUserId - External user ID from the provider
 * @returns {Promise<typeof users.$inferSelect | null>} User object or null if not found
 */
export async function findUserByOAuth(provider: string, providerUserId: string) {
	const result = await db
		.select({ user: users })
		.from(oauthAccounts)
		.innerJoin(users, eq(oauthAccounts.userId, users.id))
		.where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerUserId, providerUserId)))
		.limit(1);

	return result.length > 0 ? result[0].user : null;
}

/**
 * Lists all OAuth providers connected to a user
 * 
 * @param userId - The local user ID
 * @returns {Promise<Array<{provider: string, providerUserId: string, connectedAt: Date}>>}
 */
export async function listUserOAuthProviders(userId: number) {
	const accounts = await db
		.select({
			provider: oauthAccounts.provider,
			providerUserId: oauthAccounts.providerUserId,
			connectedAt: oauthAccounts.createdAt,
		})
		.from(oauthAccounts)
		.where(eq(oauthAccounts.userId, userId));

	return accounts;
}

/**
 * Disconnects an OAuth account from a user
 * 
 * @param userId - The local user ID
 * @param provider - OAuth provider name
 * @returns {Promise<void>}
 */
export async function disconnectOAuthAccount(userId: number, provider: string): Promise<void> {
	await db
		.delete(oauthAccounts)
		.where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)));
}

/**
 * Updates OAuth token expiration and refresh token
 * 
 * @param userId - The local user ID
 * @param provider - OAuth provider name
 * @param newAccessToken - New access token (will be encrypted)
 * @param newRefreshToken - Optional new refresh token
 * @param expiresAt - New expiration time
 * @returns {Promise<void>}
 */
export async function refreshOAuthToken(
	userId: number,
	provider: string,
	newAccessToken: string,
	newRefreshToken?: string,
	expiresAt?: Date
): Promise<void> {
	const encryptedAccessToken = await encryptToken(newAccessToken);
	const encryptedRefreshToken = newRefreshToken ? await encryptToken(newRefreshToken) : undefined;

	await db
		.update(oauthAccounts)
		.set({
			accessToken: encryptedAccessToken,
			refreshToken: encryptedRefreshToken,
			expiresAt: expiresAt,
			updatedAt: new Date(),
		})
		.where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)));
}

/**
 * Checks if a user is connected to a specific OAuth provider
 * 
 * @param userId - The local user ID
 * @param provider - OAuth provider name
 * @returns {Promise<boolean>}
 */
export async function isUserConnectedToProvider(userId: number, provider: string): Promise<boolean> {
	const account = await db
		.select()
		.from(oauthAccounts)
		.where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)))
		.limit(1);

	return account.length > 0;
}

/**
 * Checks if OAuth token needs refresh based on expiration
 * 
 * @param userId - The local user ID
 * @param provider - OAuth provider name
 * @param bufferSeconds - Seconds before actual expiration to consider "needs refresh" (default: 300 = 5 minutes)
 * @returns {Promise<boolean>}
 */
export async function needsTokenRefresh(userId: number, provider: string, bufferSeconds = 300): Promise<boolean> {
	const account = await db
		.select({ expiresAt: oauthAccounts.expiresAt })
		.from(oauthAccounts)
		.where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)))
		.limit(1);

	if (account.length === 0 || !account[0].expiresAt) {
		return false;
	}

	const now = new Date();
	const bufferTime = new Date(now.getTime() + bufferSeconds * 1000);

	return account[0].expiresAt <= bufferTime;
}

/**
 * Exchanges OAuth authorization code for access token
 * 
 * @param provider - OAuth provider ('github' or '42')
 * @param code - Authorization code from OAuth provider
 * @returns {Promise<{ access_token: string, refresh_token?: string, expires_in?: number }>}
 */
/**
 * Maps a provider name to the environment variable prefix.
 * '42' uses the FORTYTWO_ prefix since env var names cannot start with a digit.
 */
function getProviderEnvKey(provider: string): string {
	return provider === '42' ? 'FORTYTWO' : provider.toUpperCase();
}

export async function exchangeCodeForToken(
	provider: string,
	code: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
	const envKey = getProviderEnvKey(provider);
	const clientId = process.env[`${envKey}_CLIENT_ID`];
	const clientSecret = process.env[`${envKey}_CLIENT_SECRET`];
	const tokenUrl = process.env[`${envKey}_TOKEN_URL`];
	const redirectUri = process.env[`${envKey}_CALLBACK_URL`];

	if (!clientId || !clientSecret || !tokenUrl || !redirectUri) {
		throw new Error(`Missing OAuth configuration for provider: ${provider}`);
	}

	const response = await fetch(tokenUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		body: JSON.stringify({
			client_id: clientId,
			client_secret: clientSecret,
			code,
			grant_type: 'authorization_code',
			redirect_uri: redirectUri,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		console.error(`Token exchange failed for ${provider}:`, error);
		throw new Error(`Failed to exchange code for token: ${response.statusText}`);
	}

	return response.json();
}

/**
 * Fetches user information from OAuth provider
 * 
 * @param provider - OAuth provider ('github' or '42')
 * @param accessToken - OAuth access token
 * @returns {Promise<OAuthProviderInfo>}
 */
export async function fetchUserInfo(provider: string, accessToken: string): Promise<OAuthProviderInfo & { username: string; id: string; avatar_url?: string }> {
	const userUrl = process.env[`${getProviderEnvKey(provider)}_USER_URL`];

	if (!userUrl) {
		throw new Error(`Missing user info URL for provider: ${provider}`);
	}

	const response = await fetch(userUrl, {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'Accept': 'application/json',
		},
	});

	if (!response.ok) {
		const error = await response.text();
		console.error(`Failed to fetch user info from ${provider}:`, error);
		throw new Error(`Failed to fetch user information: ${response.statusText}`);
	}

	const data = await response.json();

	// Normalize provider-specific fields
	if (provider === 'github') {
		const id = String(data.id);
		const username = data.login || `user_${id}`;

		// GitHub omits email when user has set it to private.
		// The user:email scope lets us fetch it from the emails endpoint.
		let email = data.email;
		if (!email) {
			const emailsUrl = process.env.GITHUB_USER_EMAILS_URL;
			if (emailsUrl) {
				const emailsResponse = await fetch(emailsUrl, {
					headers: { 'Authorization': `Bearer ${accessToken}` },
				});
				if (emailsResponse.ok) {
					const emails = await emailsResponse.json();
					email = emails.find((e: any) => e.primary && e.verified)?.email
						?? emails.find((e: any) => e.verified)?.email
						?? emails[0]?.email;
				}
			}
		}

		return {
			provider: 'github',
			providerUserId: id,
			id,
			username,
			email,
			name: data.name,
			avatar: data.avatar_url,
			avatar_url: data.avatar_url,
		};
	} else if (provider === '42') {
		// Fetch email separately for 42 if not in main response
		let email = data.email;
		if (!email) {
			const emailUrl = process.env.FORTYTWO_USER_EMAILS_URL;
			if (emailUrl) {
				const emailResponse = await fetch(emailUrl, {
					headers: { 'Authorization': `Bearer ${accessToken}` },
				});
				if (emailResponse.ok) {
					const emails = await emailResponse.json();
					email = emails.find((e: any) => e.primary)?.email || emails[0]?.email;
				}
			}
		}
		
		const id = String(data.id);
		const username = data.login || `user_${id}`;
		
		return {
			provider: '42',
			providerUserId: id,
			id,
			username,
			email,
			name: data.displayname || data.first_name,
			avatar: data.image?.link,
			avatar_url: data.image?.link,
		};
	}

	throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * Generates a CSRF state token and stores it in the database
 * 
 * @returns {Promise<string>} The generated state token
 */
export async function generateOAuthState(): Promise<string> {
	const state = randomBytes(64).toString('hex'); // 128-character hex string
	const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration

	await db.insert(oauthStates).values({
		state,
		used: false,
		expiresAt,
	});

	return state;
}

/**
 * Builds the OAuth authorization URL
 * 
 * @param provider - OAuth provider ('github' or '42')
 * @param state - CSRF state token
 * @returns {string} The authorization URL to redirect to
 */
export function buildOAuthAuthorizationUrl(provider: string, state: string): string {
	const envKey = getProviderEnvKey(provider);
	const authorizeUrl = process.env[`${envKey}_AUTHORIZE_URL`];
	const clientId = process.env[`${envKey}_CLIENT_ID`];
	const callbackUrl = process.env[`${envKey}_CALLBACK_URL`];

	if (!authorizeUrl || !clientId || !callbackUrl) {
		throw new Error(`Missing OAuth configuration for provider: ${provider}`);
	}

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: callbackUrl,
		state,
		scope: provider === 'github'
			? 'user:email'
			: 'public profile email',
	});

	return `${authorizeUrl}?${params.toString()}`;
}

