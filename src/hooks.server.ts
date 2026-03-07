import type { Handle } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth/lucia';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(lucia.sessionCookieName);
	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await lucia.validateSession(sessionId);
	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}

	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}

	// Block soft-deleted users even if they have a valid session
	if (user && user.is_deleted) {
		await lucia.invalidateSession(sessionId);
		const blankCookie = lucia.createBlankSessionCookie();
		event.cookies.set(blankCookie.name, blankCookie.value, {
			path: '.',
			...blankCookie.attributes
		});
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	event.locals.user = user;
	event.locals.session = session;

	return resolve(event);

};
