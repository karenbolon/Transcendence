import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { friendships, users } from '$lib/server/db/schema';
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
		const rows = await db
			.select({
				id: users.id,
				username: users.username,
				avatar_url: users.avatar_url,
				is_online: users.is_online,
			})
			.from(friendships)
			.innerJoin(
				users,
				or(
					and(eq(friendships.user_id, userId), eq(users.id, friendships.friend_id)),
					and(eq(friendships.friend_id, userId), eq(users.id, friendships.user_id))
				)
			)
			.where(
				and(
					eq(friendships.status, 'accepted'),
					eq(users.is_deleted, false)
				)
			);

		const seen = new Set<number>();
		friends = rows.filter((row) => {
			if (seen.has(row.id)) return false;
			seen.add(row.id);
			return true;
		});
	} catch (error) {
		// friendships table might not exist yet
	}

	return {
		user: locals.user,
		friends,
	};
};