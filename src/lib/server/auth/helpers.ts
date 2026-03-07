import { redirect } from '@sveltejs/kit';
import { lucia } from './lucia';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';

/**
 * Require authentication — redirects to /login if not logged in.
 * Returns the userId as a number.
 */
export function requireAuth(locals: App.Locals): number {
	if (!locals.user) {
		throw redirect(302, '/login');
	}
	return Number(locals.user.id);
}

/**
 * Redirect away if already logged in (for login/register pages).
 */
export function redirectIfLoggedIn(locals: App.Locals) {
	if (locals.user) {
		throw redirect(302, '/');
	}
}

/**
 * Create a session, set the cookie, and mark user online.
 */
export async function createAndSetSession(userId: number, cookies: Cookies) {
	const session = await lucia.createSession(String(userId), {});
	const sessionCookie = lucia.createSessionCookie(session.id);
	cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '.',
		...sessionCookie.attributes,
	});
	await db.update(users).set({ is_online: true }).where(eq(users.id, userId));
}

/**
 * Clear the session cookie (for logout/account deletion).
 */
export function clearSessionCookie(cookies: Cookies) {
	const sessionCookie = lucia.createBlankSessionCookie();
	cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '.',
		...sessionCookie.attributes,
	});
}