import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFriendProfiles } from '$lib/server/db/helpers_queries';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const friends = await getFriendProfiles(Number(user.id));
	return json({ friends });
};