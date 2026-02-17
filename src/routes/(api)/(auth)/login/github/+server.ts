import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateAuthorizationUrl, generateState } from '$lib/server/auth/oauth';
import { dev } from '$app/environment';

export const GET: RequestHandler = async ({ cookies }) => {
	// Generate CSRF protection state
	const state = generateState();
	
	// Store state in cookie for verification in callback
	cookies.set('oauth_state', state, {
		path: '/',
		httpOnly: true,
		secure: !dev, // ✅ Secure in production
		sameSite: 'lax',
		maxAge: 60 * 10 // 10 minutes
	});

	// Generate GitHub authorization URL
	const authUrl = generateAuthorizationUrl('github', state);
	
	// Redirect user to GitHub OAuth page
	redirect(302, authUrl);
};
