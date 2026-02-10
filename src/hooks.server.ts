import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import * as auth from '$lib/server/auth';

const SUPPORTED = new Set(['en', 'de', 'es', 'fr']);

const handleLocale: Handle = async ({ event, resolve }) => {
	//1) cookie wins (user selection)
	const cookieLocale = event.cookies.get('locale');

	//2) otherwise use Accept-Language header (browswer preference)
	const accept = event.request.headers.get('accept-language') ?? '';
	const acceptShort = accept.split(',')[0]?.split('-')[0]; //"de-DE" -> "de"

	const locale = 
		(cookieLocale && SUPPORTED.has(cookieLocale) && cookieLocale) ||
		(acceptShort && SUPPORTED.has(acceptShort) && acceptShort) ||
		'en';
	event.locals.locale = locale;

	return resolve(event);
};

const handleAuth: Handle = async ({ event, resolve }) => {

	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;

		return resolve(event);
	}

	const { session, user } = await auth.validateSessionToken(sessionToken);

	if (session) {
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
	} else {
		auth.deleteSessionTokenCookie(event);
	}

	event.locals.user = user;
	event.locals.session = session;

	return resolve(event);
};


export const handle: Handle = sequence(handleLocale, handleAuth);
