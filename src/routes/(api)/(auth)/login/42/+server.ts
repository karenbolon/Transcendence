// src/routes/(api)/(auth)/login/42/+server.ts
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateAuthorizationUrl, generateState } from '$lib/server/auth/oauth';

export const GET: RequestHandler = async ({ cookies }) => {
	// Generate CSRF protection state
	const state = generateState();
	
	// Store state in cookie for verification in callback
	cookies.set('oauth_state', state, {
		path: '/',
		httpOnly: true,
		secure: false, // TODO: Set to true in production with HTTPS
		sameSite: 'lax',
		maxAge: 60 * 10 // 10 minutes
	});

	// Generate 42 Intra authorization URL
	const authUrl = generateAuthorizationUrl('42', state);
	
	// Redirect user to 42 Intra OAuth page
	redirect(302, authUrl);
};
