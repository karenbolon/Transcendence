import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { friendships, users } from '$lib/server/db/schema';
import { eq, and, or, ilike, ne } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const userId = Number(locals.user.id);
	const query = url.searchParams.get('q')?.trim();

	if (!query || query.length < 2) {
		return json({ results: [] });
	}

	// Search by username (case-insensitive)
	const matchedUsers = await db
		.select({
			id: users.id,
			username: users.username,
			avatar_url: users.avatar_url,
			is_online: users.is_online,
		})
		.from(users)
		.where(
			and(
				ilike(users.username, `%${query}%`),
				ne(users.id, userId),
				eq(users.is_deleted, false)
			)
		)
		.limit(20);

	// Get relationship status for each result
	const userIds = matchedUsers.map(u => u.id);
	const relationshipMap: Record<number, { status: string; friendshipId: number }> = {};

	if (userIds.length > 0) {
		const rows = await db
			.select()
			.from(friendships)
			.where(
				or(
					eq(friendships.user_id, userId),
					eq(friendships.friend_id, userId)
				)
			);

		for (const row of rows) {
			const otherId = row.user_id === userId ? row.friend_id : row.user_id;
			if (userIds.includes(otherId)) {
				relationshipMap[otherId] = { status: row.status, friendshipId: row.id };
			}
		}
	}

	const results = matchedUsers.map(u => ({
		id: u.id,
		username: u.username,
		avatar_url: u.avatar_url,
		is_online: u.is_online,
		relationship: relationshipMap[u.id]?.status ?? null,
		friendshipId: relationshipMap[u.id]?.friendshipId ?? null,
	}));

	return json({ results });
};
