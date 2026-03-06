import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PUT: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const userId = Number(locals.user.id);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request' }, { status: 400 });
	}

	const { friendRequests, gameInvites, matchResults } = body as {
		friendRequests?: boolean;
		gameInvites?: boolean;
		matchResults?: boolean;
	};

	const prefs: Record<string, boolean> = {};
	if (typeof friendRequests === 'boolean') prefs.friendRequests = friendRequests;
	if (typeof gameInvites === 'boolean') prefs.gameInvites = gameInvites;
	if (typeof matchResults === 'boolean') prefs.matchResults = matchResults;

	if (Object.keys(prefs).length === 0) {
		return json({ error: 'No preferences provided' }, { status: 400 });
	}

	const [user] = await db
		.select({ notification_prefs: users.notification_prefs })
		.from(users)
		.where(eq(users.id, userId));

	const currentPrefs = (user?.notification_prefs as Record<string, boolean>) ?? {
		friendRequests: true,
		gameInvites: true,
		matchResults: true,
	};

	const mergedPrefs = { ...currentPrefs, ...prefs };

	await db
		.update(users)
		.set({ notification_prefs: mergedPrefs, updated_at: new Date() })
		.where(eq(users.id, userId));

	return json({ success: true, prefs: mergedPrefs });
};
