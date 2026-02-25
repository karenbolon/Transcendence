// src/routes/(api)/auth/callback/42/+server.ts
import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exchangeCodeForToken, fetchUserInfo } from '$lib/server/auth/oauth';
import { encryptToken } from '$lib/server/auth/token-encryption';
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
		const tokenData = await exchangeCodeForToken('42', code);
		
		// Step 1.5: Encrypt tokens before storing in database
		const encryptedAccessToken = await encryptToken(tokenData.access_token);
		const encryptedRefreshToken = tokenData.refresh_token 
			? await encryptToken(tokenData.refresh_token)
			: null;
		
		// Step 2: Fetch user information from 42 Intra
		const oauthUser = await fetchUserInfo('42', tokenData.access_token);

		if (!oauthUser.email) {
			error(400, 'Email is required from 42 Intra profile.');
		}

		// Step 3: Check if OAuth account already exists
		const [existingOAuthAccount] = await db
			.select()
			.from(oauthAccounts)
			.where(
				and(
					eq(oauthAccounts.provider, '42'),
					eq(oauthAccounts.providerUserId, oauthUser.id)
				)
			)
			.limit(1);

		let userId: number;

		if (existingOAuthAccount) {
			// User has logged in with 42 before
			userId = existingOAuthAccount.userId;

			// Update the OAuth tokens
			await db
				.update(oauthAccounts)
				.set({
					accessToken: encryptedAccessToken,
					refreshToken: encryptedRefreshToken,
					expiresAt: tokenData.expires_in
						? new Date(Date.now() + tokenData.expires_in * 1000)
						: null,
					updatedAt: new Date()
				})
				.where(
					and(
						eq(oauthAccounts.provider, '42'),
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
				// Link 42 account to existing user
				userId = existingUser.id;

				await db.insert(oauthAccounts).values({
					provider: '42',
					providerUserId: oauthUser.id,
					userId,
					accessToken: encryptedAccessToken,
					refreshToken: encryptedRefreshToken,
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

				// Link OAuth account
				await db.insert(oauthAccounts).values({
					provider: '42',
					providerUserId: oauthUser.id,
					userId,
					accessToken: encryptedAccessToken,
					refreshToken: encryptedRefreshToken,
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
		console.error('OAuth error:', err);
		
		// Don't leak detailed error messages to users
		error(500, 'Authentication failed. Please try again.');
	}
};
