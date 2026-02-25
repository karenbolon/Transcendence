import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { player_progression } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// If not logged in, send them to login
	if (!locals.user) {
		redirect(302, '/login');
	}

	// Fetch progression data
	const userId = Number(locals.user.id);
	const [progression] = await db
		.select()
		.from(player_progression)
		.where(eq(player_progression.user_id, userId));

	// User is logged in — pass their data to the page
	return {
		user: locals.user,
		progression: progression
			? {
				level: progression.current_level,
				currentXp: progression.current_xp,
				xpToNextLevel: progression.xp_to_next_level,
				totalXp: progression.total_xp,
			}
			: null,
	};
};
