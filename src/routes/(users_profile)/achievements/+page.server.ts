import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { achievements, achievement_definitions, player_progression } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { mapProgressionRow } from '$lib/utils/format_utils';
import type { Tier } from '$lib/types/progression';
import { requireAuth } from '$lib/server/auth/helpers';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireAuth(locals);

	// Fetch ALL achievement definitions
	const allDefinitions = await db
		.select()
		.from(achievement_definitions)
		.orderBy(achievement_definitions.category, achievement_definitions.tier);

	// Fetch user's unlocked achievements
	const userAchievements = await db
		.select()
		.from(achievements)
		.where(eq(achievements.user_id, userId));

	const unlockedMap = new Map(
		userAchievements.map(a => [a.achievement_id, a.unlocked_at])
	);

	// Merge definitions with unlock status
	const allAchievements = allDefinitions.map(def => ({
		id: def.id,
		name: def.name,
		description: def.description,
		tier: def.tier as Tier,
		category: def.category,
		icon: def.icon,
		unlockedAt: unlockedMap.get(def.id)?.toISOString() ?? null,
		// Progress + hint are optional — add them to your
		// achievement_definitions table if you want, or compute
		// them dynamically based on the user's stats.
		// For now these come from the DB if the columns exist,
		// otherwise they default to null.
		progress: (def as any).progress_current != null && (def as any).progress_target != null
			? [(def as any).progress_current, (def as any).progress_target] as [number, number]
			: null,
		hint: (def as any).hint ?? null
	}));

	// Group by category
	const categories = [...new Set(allDefinitions.map(d => d.category))];

	// Fetch progression for header
	const [progression] = await db
		.select()
		.from(player_progression)
		.where(eq(player_progression.user_id, userId));

	const unlockedCount = userAchievements.length;
	const totalCount = allDefinitions.length;

	return {
		achievements: allAchievements,
		categories,
		unlockedCount,
		totalCount,
		progression: progression ? mapProgressionRow(progression) : null,
	};
};
