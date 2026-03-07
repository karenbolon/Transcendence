import { db } from '$lib/server/db';
import { friendships, users, achievements, achievement_definitions } from '$lib/server/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import type { Tier } from '$lib/types/progression';

/**
 * Get IDs of all accepted friends for a user.
 */
export async function getFriendIds(userId: number): Promise<number[]> {
	const rows = await db
		.select()
		.from(friendships)
		.where(
			and(
				eq(friendships.status, 'accepted'),
				or(
					eq(friendships.user_id, userId),
					eq(friendships.friend_id, userId)
				)
			)
		);

	return rows.map((f) =>
		f.user_id === userId ? f.friend_id : f.user_id
	);
}

/**
 * Get full friend profiles (with user details) for a user.
 * Used by the layout to show friends list.
 */
export async function getFriendProfiles(userId: number) {
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

	// Deduplicate
	const seen = new Set<number>();
	return rows.filter((row) => {
		if (seen.has(row.id)) return false;
		seen.add(row.id);
		return true;
	});
}

/**
 * Get all achievements unlocked by a user, joined with definitions.
 */
export async function getUserAchievements(userId: number) {
	const rows = await db
		.select({
			id: achievement_definitions.id,
			name: achievement_definitions.name,
			description: achievement_definitions.description,
			tier: achievement_definitions.tier,
			category: achievement_definitions.category,
			icon: achievement_definitions.icon,
			unlockedAt: achievements.unlocked_at,
		})
		.from(achievements)
		.innerJoin(
			achievement_definitions,
			eq(achievements.achievement_id, achievement_definitions.id)
		)
		.where(eq(achievements.user_id, userId))
		.orderBy(desc(achievements.unlocked_at));

	return rows.map((a) => ({
		id: a.id,
		name: a.name,
		description: a.description,
		tier: a.tier as Tier,
		category: a.category,
		icon: a.icon,
		unlockedAt: a.unlockedAt?.toISOString() ?? null,
	}));
}