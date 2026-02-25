import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { achievements, achievement_definitions, player_progression } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(302, '/login');
    }

    const userId = Number(locals.user.id);

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
        tier: def.tier,
        category: def.category,
        icon: def.icon,
        unlockedAt: unlockedMap.get(def.id)?.toISOString() ?? null,
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
        progression: progression
            ? {
                level: progression.current_level,
                currentXp: progression.current_xp,
                xpToNextLevel: progression.xp_to_next_level,
            }
            : null,
    };
};
