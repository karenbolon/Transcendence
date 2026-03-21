import { redirect, error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exchangeCodeForToken, fetchUserInfo } from '$lib/server/auth/oauth';
import { encryptToken } from '$lib/server/auth/token-encryption';
import { createAndSetSession } from '$lib/server/auth/helpers';
import { db } from '$lib/server/db';
import { users, oauthAccounts, oauthStates } from '$lib/server/db/schema';
import { eq, and, gt } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (!code) error(400, 'No authorization code provided');
	if (!state) error(400, 'No state provided');

	// Verify state against database (prevent CSRF)
	const [storedState] = await db
		.select()
		.from(oauthStates)
		.where(
			and(
				eq(oauthStates.state, state),
				eq(oauthStates.used, false),
				gt(oauthStates.expiresAt, new Date())
			)
		)
		.limit(1);

	if (!storedState) error(400, 'Invalid or expired OAuth state');

	// Immediately invalidate state to prevent replay attacks
	await db
		.update(oauthStates)
		.set({ used: true })
		.where(eq(oauthStates.state, state));

	// Resolve the local userId from the OAuth flow
	let userId: number;

	try {
		// Step 1: Exchange code for access token
		const tokenData = await exchangeCodeForToken('42', code);

		// Step 2: Encrypt tokens before storing
		const encryptedAccessToken = await encryptToken(tokenData.access_token);
		const encryptedRefreshToken = tokenData.refresh_token
			? await encryptToken(tokenData.refresh_token)
			: null;

		// Step 3: Fetch user information from 42 Intra
		const oauthUser = await fetchUserInfo('42', tokenData.access_token);

		if (!oauthUser.email) {
			error(400, 'Email is required from 42 Intra profile.');
		}

		// Step 4: Find or create the local user
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

		if (existingOAuthAccount) {
			userId = existingOAuthAccount.userId;

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
			const [existingUser] = await db
				.select()
				.from(users)
				.where(eq(users.email, oauthUser.email))
				.limit(1);

			if (existingUser) {
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
				// New user — find a unique username
				let username = oauthUser.username;
				let usernameCounter = 1;

				while (true) {
					const [taken] = await db
						.select()
						.from(users)
						.where(eq(users.username, username))
						.limit(1);

					if (!taken) break;
					username = `${oauthUser.username}${usernameCounter}`;
					usernameCounter++;
				}

				const [newUser] = await db
					.insert(users)
					.values({
						username,
						email: oauthUser.email,
						name: oauthUser.name || username,
						password_hash: null,
						avatar_url: oauthUser.avatar_url || null
					})
					.returning();

				userId = newUser.id;

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
	} catch (err) {
		if (isHttpError(err)) throw err;
		console.error('42 OAuth callback error:', err);
		error(500, 'Failed to complete OAuth authentication');
	}

	// Session creation and redirect are outside try/catch so the Set-Cookie
	// header is always attached to the redirect response directly.
	await createAndSetSession(userId!, cookies);
	redirect(302, '/');
};
