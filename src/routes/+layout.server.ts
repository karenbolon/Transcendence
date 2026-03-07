import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { friendships, users } from '$lib/server/db/schema';
import { getFriendProfiles } from '$lib/server/db/helpers_queries';
import { eq, and, or } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { user: null, friends: [] };
	}

	const userId = Number(locals.user.id);

	let friends: Array<{
		id: number;
		username: string;
		avatar_url: string | null;
		is_online: boolean | null;
	}> = [];

	try {
		friends = await getFriendProfiles(userId);
	} catch (error) {
		// friendships table might not exist yet
	}

	return {
		user: locals.user,
		friends,
	};
};