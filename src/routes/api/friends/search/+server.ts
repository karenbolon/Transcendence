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

	// Search by username or name(case-insensitive)
	const matchedUsers = await db
		.select({
			id: users.id,
			username: users.username,
			name: users.name,
			avatar_url: users.avatar_url,
			is_online: users.is_online,
		})
		.from(users)
		.where(
			and(
				or(
					ilike(users.username, `%${query}%`),
					ilike(users.name, `%${query}%`)
				),
				ne(users.id, userId),
				eq(users.is_deleted, false)
			)
		)
		.limit(20);

	// Get relationship status for each result
	const userIds = matchedUsers.map(u => u.id);
	const relationshipMap: Record<number, { status: string; friendshipId: number; blockedByMe: boolean; direction: 'incoming' | 'outgoing' }> = {};

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
				relationshipMap[otherId] = {
					status: row.status,
					friendshipId: row.id,
					blockedByMe: row.status === 'blocked' && row.user_id === userId,
					direction: row.user_id === userId ? 'outgoing' : 'incoming'
				};
			}
		}
	}

	const results = matchedUsers.map(u => {
		const rel = relationshipMap[u.id];
		const theyBlockedMe = rel?.status === 'blocked' && !rel?.blockedByMe;

		return {
			id: u.id,
			username: u.username,
			name: u.name,
			avatar_url: u.avatar_url,
			// If they blocked me: show as offline, show as "friends" (not blocked)
			is_online: theyBlockedMe ? false : u.is_online,
			relationship: theyBlockedMe ? 'accepted' : (rel?.status ?? null),
			relationshipDirection: theyBlockedMe ? null : (rel?.direction ?? null),
			blockedByMe: rel?.blockedByMe ?? false,
			friendshipId: theyBlockedMe ? (rel?.friendshipId ?? null) : (rel?.friendshipId ?? null),
		};
	});

	return json({ results });
};
