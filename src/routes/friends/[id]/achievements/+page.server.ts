import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users, achievements, achievement_definitions, player_progression } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { mapProgressionRow } from '$lib/utils/format_utils';
import type { Tier } from '$lib/types/progression';
import { requireAuth } from '$lib/server/auth/helpers';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireAuth(locals);
	const friendId = Number(params.id);

	if (isNaN(friendId)) {
		throw error(404, 'User not found');
	}

	// Verify user exists
	const [friend] = await db
		.select({ id: users.id, username: users.username, name: users.name })
		.from(users)
		.where(and(eq(users.id, friendId), eq(users.is_deleted, false)));

	if (!friend) {
		throw error(404, 'User not found');
	}

	// Fetch ALL achievement definitions
	const allDefinitions = await db
		.select()
		.from(achievement_definitions)
		.orderBy(achievement_definitions.category, achievement_definitions.tier);

	// Fetch FRIEND's unlocked achievements
	const userAchievements = await db
		.select()
		.from(achievements)
		.where(eq(achievements.user_id, friendId));

	const unlockedMap = new Map(
		userAchievements.map(a => [a.achievement_id, a.unlocked_at])
	);

	const allAchievements = allDefinitions.map(def => ({
		id: def.id,
		name: def.name,
		description: def.description,
		tier: def.tier as Tier,
		category: def.category,
		icon: def.icon,
		unlockedAt: unlockedMap.get(def.id)?.toISOString() ?? null,
		progress: (def as any).progress_current != null && (def as any).progress_target != null
			? [(def as any).progress_current, (def as any).progress_target] as [number, number]
			: null,
		hint: (def as any).hint ?? null
	}));

	const categories = [...new Set(allDefinitions.map(d => d.category))];

	const [progression] = await db
		.select()
		.from(player_progression)
		.where(eq(player_progression.user_id, friendId));

	return {
		friend: {
			id: friend.id,
			username: friend.username,
			name: friend.name,
		},
		achievements: allAchievements,
		categories,
		unlockedCount: userAchievements.length,
		totalCount: allDefinitions.length,
		progression: progression ? mapProgressionRow(progression) : null,
	};
};