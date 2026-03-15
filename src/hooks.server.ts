import type { Handle, HandleServerError } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth/lucia';
import { clearSessionCookie } from '$lib/server/auth/helpers';
import { logger } from '$lib/server/logger';

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
		clearSessionCookie(event.cookies);
	}

	// Block soft-deleted users even if they have a valid session
	if (user && user.is_deleted) {
		await lucia.invalidateSession(sessionId);
		clearSessionCookie(event.cookies);
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	event.locals.user = user;
	event.locals.session = session;

	// Set HTML lang attribute based on user's language preference
	const userLanguage = user?.language || 'en';
	
	return resolve(event, {
		transformPageChunk: ({ html }) => {
			return html.replace('%lang%', userLanguage);
		}
	});

};

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	const errorId = crypto.randomUUID();
	logger.error(
		{ err: error, errorId, status, path: event.url.pathname },
		message
	);
	return { message: 'Internal error', errorId };
};
