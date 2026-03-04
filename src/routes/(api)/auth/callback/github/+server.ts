// src/routes/(api)/auth/callback/github/+server.ts
import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exchangeCodeForToken, fetchUserInfo } from '$lib/server/auth/oauth';
import { db } from '$lib/server/db';
import { users, oauthAccounts } from '$lib/server/db/schema';
import { lucia } from '$lib/server/auth/lucia';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('oauth_state');

	// Verify state to prevent CSRF attacks
	if (!state || !storedState || state !== storedState) {
		console.error('OAuth state mismatch');
		error(400, 'Invalid OAuth state');
	}

	if (!code) {
		console.error('No OAuth code provided');
		error(400, 'No authorization code provided');
	}

	// Clear the state cookie
	cookies.delete('oauth_state', { path: '/' });

	try {
		// Step 1: Exchange code for access token
		const tokenData = await exchangeCodeForToken('github', code);
		
		// TODO: CRITICAL SECURITY ISSUE - Tokens stored as plain text!
		// Before storing tokenData.access_token and tokenData.refresh_token in the database,
		// they MUST be encrypted using AES-256-GCM.
		// 
		// Required implementation:
		//   import { encryptString } from '@oslojs/crypto/aes';
		//   const TOKEN_KEY = process.env.TOKEN_ENCRYPTION_KEY;
		//   const encryptedAccessToken = await encryptString(tokenData.access_token, TOKEN_KEY);
		//   const encryptedRefreshToken = tokenData.refresh_token 
		//     ? await encryptString(tokenData.refresh_token, TOKEN_KEY) 
		//     : null;
		//
		// Then use encryptedAccessToken and encryptedRefreshToken in all db.insert() calls below.
		
		// Step 2: Fetch user information from GitHub
		const oauthUser = await fetchUserInfo('github', tokenData.access_token);

		if (!oauthUser.email) {
			error(400, 'Email is required. Please make your email public in GitHub settings.');
		}

		// Step 3: Check if OAuth account already exists
		const [existingOAuthAccount] = await db
			.select()
			.from(oauthAccounts)
			.where(
				and(
					eq(oauthAccounts.provider, 'github'),
					eq(oauthAccounts.providerUserId, oauthUser.id)
				)
			)
			.limit(1);

		let userId: number;

		if (existingOAuthAccount) {
			// User has logged in with GitHub before
			userId = existingOAuthAccount.userId;

			// TODO: These tokens are stored UNENCRYPTED - security risk!
			// Update the OAuth tokens
			await db
				.update(oauthAccounts)
				.set({
					accessToken: tokenData.access_token, // TODO: Should be encrypted!
					refreshToken: tokenData.refresh_token || null, // TODO: Should be encrypted!
					expiresAt: tokenData.expires_in
						? new Date(Date.now() + tokenData.expires_in * 1000)
						: null,
					updatedAt: new Date()
				})
				.where(
					and(
						eq(oauthAccounts.provider, 'github'),
						eq(oauthAccounts.providerUserId, oauthUser.id)
					)
				);
		} else {
			// New OAuth user - check if email already exists
			const [existingUser] = await db
				.select()
				.from(users)
				.where(eq(users.email, oauthUser.email))
				.limit(1);

			if (existingUser) {
				// Link GitHub account to existing user
				userId = existingUser.id;

				// TODO: Tokens stored UNENCRYPTED!
				await db.insert(oauthAccounts).values({
					provider: 'github',
					providerUserId: oauthUser.id,
					userId,
					accessToken: tokenData.access_token, // TODO: Encrypt this!
					refreshToken: tokenData.refresh_token || null, // TODO: Encrypt this!
					expiresAt: tokenData.expires_in
						? new Date(Date.now() + tokenData.expires_in * 1000)
						: null
				});
			} else {
				// Create new user for OAuth
				// Generate unique username if needed
				let username = oauthUser.username;
				let usernameCounter = 1;

				while (true) {
					const [existingUsername] = await db
						.select()
						.from(users)
						.where(eq(users.username, username))
						.limit(1);

					if (!existingUsername) break;

					username = `${oauthUser.username}${usernameCounter}`;
					usernameCounter++;
				}

				// Create new user (OAuth-only, no password)
				const [newUser] = await db
					.insert(users)
					.values({
						username,
						email: oauthUser.email,
						name: oauthUser.name || username,
						password_hash: null, // OAuth users don't need passwords
						avatar_url: oauthUser.avatar_url || null
					})
					.returning();

				userId = newUser.id;

				// TODO: Tokens stored UNENCRYPTED!
				// Link OAuth account
				await db.insert(oauthAccounts).values({
					provider: 'github',
					providerUserId: oauthUser.id,
					userId,
					accessToken: tokenData.access_token, // TODO: Encrypt this!
					refreshToken: tokenData.refresh_token || null, // TODO: Encrypt this!
					expiresAt: tokenData.expires_in
						? new Date(Date.now() + tokenData.expires_in * 1000)
						: null
				});
			}
		}

		// Step 4: Create session with Lucia
		const session = await lucia.createSession(String(userId), {});
		const sessionCookie = lucia.createSessionCookie(session.id);

		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});

		// Step 5: Mark user as online
		await db
			.update(users)
			.set({ is_online: true })
			.where(eq(users.id, userId));

		// Redirect to dashboard
		redirect(302, '/dashboard');
	} catch (err) {
		console.error('OAuth callback error:', err);
		error(500, 'Failed to complete OAuth authentication');
	}
};
