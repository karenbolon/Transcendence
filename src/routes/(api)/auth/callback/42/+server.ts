/**
 * 42 Intra OAuth Callback Handler
 * 
 * Exchanges OAuth code for tokens and stores them encrypted in database
 * - Handles new user creation
 * - Handles existing user login
 * - Handles account linking
 * - Stores encrypted tokens
 */

import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { lucia } from '$lib/server/auth/lucia';
import {
	storeOAuthToken,
	getUserByOAuthAccount
} from '$lib/server/auth/oauth';
import { dev } from '$app/environment';

/**
 * 42 Intra OAuth Callback
 * GET /auth/callback/42?code=...&state=...
 */
export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	try {
		// Get code and state from query
		const code = url.searchParams.get('code');
		const state = url.searchParams.get('state');

		if (!code || !state) {
			throw error(400, 'Missing OAuth parameters (code or state)');
		}

		// Verify CSRF state
		const storedState = cookies.get('oauth_state');
		if (state !== storedState) {
			throw error(400, 'Invalid OAuth state (CSRF attack detected)');
		}

		// Clear state cookie
		cookies.delete('oauth_state', { path: '/' });

		// ═══════════════════════════════════════════════════════════════════
		// STEP 1: Exchange code for tokens
		// ═══════════════════════════════════════════════════════════════════

		const tokenResponse = await fetch('https://api.intra.42.fr/oauth/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				grant_type: 'authorization_code',
				client_id: process.env.FORTYTWO_CLIENT_ID,
				client_secret: process.env.FORTYTWO_CLIENT_SECRET,
				code,
				redirect_uri: process.env.PUBLIC_OAUTH_REDIRECT_URI + '/auth/callback/42'
			})
		});

		if (!tokenResponse.ok) {
			console.error('42 Intra token exchange failed:', tokenResponse.statusText);
			throw error(500, 'Failed to exchange OAuth code for tokens');
		}

		const tokenData = await tokenResponse.json();

		if (tokenData.error) {
			console.error('42 Intra OAuth error:', tokenData.error_description);
			throw error(400, tokenData.error_description || 'OAuth error');
		}

		if (!tokenData.access_token) {
			throw error(500, 'No access token received from 42 Intra');
		}

		// ═══════════════════════════════════════════════════════════════════
		// STEP 2: Get user info from 42 Intra API
		// ═══════════════════════════════════════════════════════════════════

		const userResponse = await fetch('https://api.intra.42.fr/v2/me', {
			headers: {
				Authorization: `Bearer ${tokenData.access_token}`,
				'Accept': 'application/json'
			}
		});

		if (!userResponse.ok) {
			console.error('42 Intra user fetch failed:', userResponse.statusText);
			throw error(500, 'Failed to fetch 42 Intra user info');
		}

		const intraUser = await userResponse.json();

		if (!intraUser.id) {
			throw error(500, 'Invalid 42 Intra user data');
		}

		// ═══════════════════════════════════════════════════════════════════
		// STEP 3: Check if user exists
		// ═══════════════════════════════════════════════════════════════════

		let user = await getUserByOAuthAccount('42', intraUser.id.toString());

		if (!user) {
			// User doesn't exist - check if logged in and linking account
			if (locals.user) {
				// Link OAuth to existing local user
				console.log(`Linking 42 Intra (${intraUser.id}) to local user ${locals.user.id}`);
				user = locals.user;
			} else {
				// Create new user
				console.log(`Creating new user from 42 Intra (${intraUser.login})`);

				try {
					const [newUser] = await db
						.insert(users)
						.values({
							username: intraUser.login,
							email: intraUser.email,
							name: intraUser.first_name && intraUser.last_name
								? `${intraUser.first_name} ${intraUser.last_name}`
								: intraUser.login,
							avatar_url: intraUser.image?.versions?.medium || intraUser.image?.link,
							bio: null,
							password_hash: '', // OAuth users don't have password
							is_online: true,
							created_at: new Date(),
							updated_at: new Date()
						})
						.returning();

					user = newUser;
				} catch (dbError) {
					console.error('Failed to create user:', dbError);
					throw error(500, 'Failed to create user account');
				}
			}
		}

		// ═══════════════════════════════════════════════════════════════════
		// STEP 4: Store encrypted OAuth tokens
		// ═══════════════════════════════════════════════════════════════════

		try {
			const expiresAt = tokenData.expires_in
				? new Date(Date.now() + tokenData.expires_in * 1000)
				: null;

			await storeOAuthToken(
				'42',
				intraUser.id.toString(),
				user.id,
				tokenData.access_token,
				tokenData.refresh_token || null,
				expiresAt,
				tokenData.scope || 'public projects'
			);

			console.log(`✅ Stored encrypted OAuth tokens for user ${user.id}`);
		} catch (encryptError) {
			console.error('Failed to store OAuth tokens:', encryptError);
			throw error(500, 'Failed to store authentication credentials');
		}

		// ═══════════════════════════════════════════════════════════════════
		// STEP 5: Create session and redirect
		// ═══════════════════════════════════════════════════════════════════

		const session = await lucia.createSession(String(user.id), {});
		const sessionCookie = lucia.createSessionCookie(session.id);

		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});

		// Update user status
		await db
			.update(users)
			.set({ is_online: true })
			.where(eq(users.id, user.id))
			.execute();

		console.log(`✅ User ${user.id} logged in via 42 Intra`);
		redirect(302, '/dashboard');
	} catch (err) {
		console.error('42 Intra OAuth callback error:', err);
		// Re-throw SvelteKit errors, handle others
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'OAuth authentication failed');
	}
};
