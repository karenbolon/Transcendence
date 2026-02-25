// src/lib/server/auth/oauth.ts
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

/**
 * OAuth Provider Configuration
 */
export type OAuthProvider = 'github' | '42';

export interface OAuthConfig {
	authorizationEndpoint: string;
	tokenEndpoint: string;
	userInfoEndpoint: string;
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	scope: string;
}

/**
 * Get OAuth configuration for a specific provider
 */
export function getOAuthConfig(provider: OAuthProvider): OAuthConfig {
	const redirectUri = publicEnv.PUBLIC_OAUTH_REDIRECT_URI || 'http://localhost:5173/auth/callback';
	
	switch (provider) {
		case 'github':
			return {
				authorizationEndpoint: 'https://github.com/login/oauth/authorize',
				tokenEndpoint: 'https://github.com/login/oauth/access_token',
				userInfoEndpoint: 'https://api.github.com/user',
				clientId: env.GITHUB_CLIENT_ID || '',
				clientSecret: env.GITHUB_CLIENT_SECRET || '',
				redirectUri: `${redirectUri}/${provider}`,
				scope: 'read:user user:email'
			};
		case '42':
			return {
				authorizationEndpoint: 'https://api.intra.42.fr/oauth/authorize',
				tokenEndpoint: 'https://api.intra.42.fr/oauth/token',
				userInfoEndpoint: 'https://api.intra.42.fr/v2/me',
				clientId: env.FORTYTWO_CLIENT_ID || '',
				clientSecret: env.FORTYTWO_CLIENT_SECRET || '',
				redirectUri: `${redirectUri}/${provider}`,
				scope: 'public'
			};
		default:
			throw new Error(`Unsupported OAuth provider: ${provider}`);
	}
}

/**
 * Generate OAuth authorization URL with state for CSRF protection
 */
export function generateAuthorizationUrl(provider: OAuthProvider, state: string): string {
	const config = getOAuthConfig(provider);
	
	const params = new URLSearchParams({
		client_id: config.clientId,
		redirect_uri: config.redirectUri,
		scope: config.scope,
		state,
		response_type: 'code'
	});

	return `${config.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * 
 * Note: The returned access_token and refresh_token are encrypted before
 * storing in the database using AES-256-GCM encryption.
 * See: src/lib/server/auth/token-encryption.ts
 * Implementation: src/routes/(api)/auth/callback/{provider}/+server.ts
 */
export async function exchangeCodeForToken(
	provider: OAuthProvider,
	code: string
): Promise<{
	access_token: string;
	token_type: string;
	scope: string;
	refresh_token?: string;
	expires_in?: number;
}> {
	const config = getOAuthConfig(provider);

	const response = await fetch(config.tokenEndpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		},
		body: JSON.stringify({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			code,
			redirect_uri: config.redirectUri,
			grant_type: 'authorization_code'
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to exchange code for token: ${error}`);
	}

	return response.json();
}

/**
 * Fetch user information from OAuth provider
 */
export async function fetchUserInfo(
	provider: OAuthProvider,
	accessToken: string
): Promise<OAuthUserInfo> {
	const config = getOAuthConfig(provider);

	const response = await fetch(config.userInfoEndpoint, {
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'Accept': 'application/json'
		}
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to fetch user info: ${error}`);
	}

	const data = await response.json();
	
	// Normalize user data based on provider
	return normalizeUserInfo(provider, data);
}

/**
 * Normalized OAuth user information
 */
export interface OAuthUserInfo {
	id: string; // Provider's user ID
	email: string;
	name: string;
	username: string;
	avatar_url?: string;
}

/**
 * Normalize user data from different OAuth providers
 */
function normalizeUserInfo(provider: OAuthProvider, data: any): OAuthUserInfo {
	switch (provider) {
		case 'github':
			return {
				id: String(data.id),
				email: data.email || '',
				name: data.name || data.login,
				username: data.login,
				avatar_url: data.avatar_url
			};
		case '42':
			return {
				id: String(data.id),
				email: data.email,
				name: data.displayname || data.login,
				username: data.login,
				avatar_url: data.image?.link
			};
		default:
			throw new Error(`Unsupported provider: ${provider}`);
	}
}

/**
 * Generate a random state string for CSRF protection
 */
export function generateState(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
