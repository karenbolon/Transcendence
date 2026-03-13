import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { friendships, users } from '$lib/server/db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth/helpers';
import { userSockets } from '$lib/server/socket';

// In production, socket state lives in the custom server.js (globalThis.__userSockets)
// In dev, it lives in the Vite-loaded module (userSockets)
function isUserOnline(userId: number): boolean {
	const prodSockets = (globalThis as any).__userSockets as Map<number, Set<string>> | undefined;
	if (prodSockets) return prodSockets.has(userId);
	return userSockets.has(userId);
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireAuth(locals);

	// Get ALL friendship rows involving this user
	const allRows = await db
		.select({
			id: friendships.id,
			user_id: friendships.user_id,
			friend_id: friendships.friend_id,
			status: friendships.status,
			created_at: friendships.created_at,
		})
		.from(friendships)
		.where(
			or(
				eq(friendships.user_id, userId),
				eq(friendships.friend_id, userId)
			)
		);

	// Collect all other user IDs we need to look up
	const otherIds = [...new Set(
		allRows.map(r => r.user_id === userId ? r.friend_id : r.user_id)
	)];

	// Fetch user details for all related users
	let userMap: Record<number, { id: number; username: string; display_name: string; avatar_url: string | null; is_online: boolean | null }> = {};
	if (otherIds.length > 0) {
		const userRows = await db
			.select({
				id: users.id,
				username: users.username,
				display_name: users.name,
				avatar_url: users.avatar_url,
				is_online: users.is_online,
			})
			.from(users)
			.where(and(inArray(users.id, otherIds), eq(users.is_deleted, false)));

		userMap = Object.fromEntries(userRows.map(u => [u.id, u]));
	}

	// Categorize into tabs
	const requests: Array<{ friendshipId: number; id: number; username: string; name: string; avatar_url: string | null; is_online: boolean | null }> = [];
	const friends: typeof requests = [];
	const sent: typeof requests = [];
	const blocked: typeof requests = [];

	for (const row of allRows) {
		const otherId = row.user_id === userId ? row.friend_id : row.user_id;
		const user = userMap[otherId];
		if (!user) continue; // deleted user

		const item = {
			friendshipId: row.id,
			id: user.id,
			username: user.username,
			name: user.display_name,
			avatar_url: user.avatar_url,
			is_online: isUserOnline(user.id),
		};

		switch (row.status) {
			case 'accepted':
				friends.push(item);
				break;
			case 'pending':
				if (row.user_id === userId) {
					sent.push(item);       // I sent it
				} else {
					requests.push(item);   // They sent it to me
				}
				break;
			case 'blocked':
				if (row.user_id === userId) {
					blocked.push(item);    // I blocked them
				} else {
					// They blocked me — I still see them as a friend, but always offline
					friends.push({ ...item, is_online: false });
				}
				break;
		}
	}

	return {
		user: locals.user,
		requests,
		friends,
		sent,
		blocked,
		counts: {
			requests: requests.length,
			friends: friends.length,
			sent: sent.length,
			blocked: blocked.length,
		},
	};
};
