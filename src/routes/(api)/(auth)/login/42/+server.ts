/**
 * 42 Intra OAuth Login Initiator
 * 
 * Generates authorization URL and redirects to 42 Intra
 */

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';

/**
 * Generate random state for CSRF protection
 */
function generateState(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < 32; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

/**
 * GET /login/42
 * Initiates 42 Intra OAuth flow
 */
export const GET: RequestHandler = async ({ cookies }) => {
	try {
		// Generate CSRF protection state
		const state = generateState();

		// Store state in httpOnly cookie for verification in callback
		cookies.set('oauth_state', state, {
			path: '/',
			httpOnly: true,        // Can't be accessed by JavaScript (XSS protection)
			secure: !dev,          // HTTPS only in production
			sameSite: 'lax',       // CSRF protection (only sent on top-level navigations)
			maxAge: 60 * 10        // 10 minutes
		});

		// Build 42 Intra authorization URL
		const params = new URLSearchParams({
			client_id: process.env.FORTYTWO_CLIENT_ID || '',
			redirect_uri: (process.env.PUBLIC_OAUTH_REDIRECT_URI || 'http://localhost:5173') + '/auth/callback/42',
			response_type: 'code',
			scope: 'public projects',
			state
		});

		const intraAuthUrl = `https://api.intra.42.fr/oauth/authorize?${params.toString()}`;

		console.log('🔐 Redirecting to 42 Intra OAuth...');
		redirect(302, intraAuthUrl);
	} catch (err) {
		console.error('42 Intra login initialization failed:', err);
		throw new Error('Failed to initiate 42 Intra login');
	}
};
