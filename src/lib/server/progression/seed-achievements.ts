/**
 * Achievement Definitions Seed Data
 *
 * Run this to populate the achievement_definitions table.
 * Can be used as a migration or standalone seed script.
 */

import { db } from '$lib/server/db';
import { achievement_definitions } from '$lib/server/db/schema';

export const ACHIEVEMENT_SEED_DATA = [
	// ── Shutout ─────────────────────────────────
	{ id: 'shutout_bronze', name: 'First Shutout', description: 'Win a game without the opponent scoring', tier: 'bronze', category: 'shutout', icon: '🛡️' },
	{ id: 'shutout_silver', name: 'Serial Shutdown', description: 'Win 10 shutout games', tier: 'silver', category: 'shutout', icon: '🛡️' },
	{ id: 'shutout_gold', name: 'Untouchable', description: 'Win 50 shutout games', tier: 'gold', category: 'shutout', icon: '🛡️' },

	// ── Streak ──────────────────────────────────
	{ id: 'streak_bronze', name: 'Hot Streak', description: 'Win 3 games in a row', tier: 'bronze', category: 'streak', icon: '🔥' },
	{ id: 'streak_silver', name: 'On Fire', description: 'Win 7 games in a row', tier: 'silver', category: 'streak', icon: '🔥' },
	{ id: 'streak_gold', name: 'Unstoppable', description: 'Win 15 games in a row', tier: 'gold', category: 'streak', icon: '🔥' },

	// ── Veteran ─────────────────────────────────
	{ id: 'veteran_bronze', name: 'Newcomer', description: 'Play 10 games', tier: 'bronze', category: 'veteran', icon: '🎮' },
	{ id: 'veteran_silver', name: 'Regular', description: 'Play 50 games', tier: 'silver', category: 'veteran', icon: '🎮' },
	{ id: 'veteran_gold', name: 'Veteran', description: 'Play 200 games', tier: 'gold', category: 'veteran', icon: '🎮' },

	// ── Scorer ──────────────────────────────────
	{ id: 'scorer_bronze', name: 'Point Collector', description: 'Score 50 total points', tier: 'bronze', category: 'scorer', icon: '🎯' },
	{ id: 'scorer_silver', name: 'Sharpshooter', description: 'Score 250 total points', tier: 'silver', category: 'scorer', icon: '🎯' },
	{ id: 'scorer_gold', name: 'Point Machine', description: 'Score 1000 total points', tier: 'gold', category: 'scorer', icon: '🎯' },

	// ── Comeback ────────────────────────────────
	{ id: 'comeback_bronze', name: 'Comeback Kid', description: 'Win a game after being down by 2+ points', tier: 'bronze', category: 'comeback', icon: '💪' },
	{ id: 'comeback_silver', name: 'Resilient', description: 'Win 5 comeback games', tier: 'silver', category: 'comeback', icon: '💪' },
	{ id: 'comeback_gold', name: 'Never Give Up', description: 'Win 20 comeback games', tier: 'gold', category: 'comeback', icon: '💪' },

	// ── Rally ───────────────────────────────────
	{ id: 'rally_bronze', name: 'Rally Player', description: 'Return the ball 100 times total', tier: 'bronze', category: 'rally', icon: '🏓' },
	{ id: 'rally_silver', name: 'Wall of Steel', description: 'Return the ball 500 times total', tier: 'silver', category: 'rally', icon: '🏓' },
	{ id: 'rally_gold', name: 'Immovable Object', description: 'Return the ball 2000 times total', tier: 'gold', category: 'rally', icon: '🏓' },
] as const;

/**
 * Seeds achievement definitions into the database.
 * Uses upsert (ON CONFLICT DO NOTHING) so it's safe to run multiple times.
 */
export async function seedAchievementDefinitions() {
	for (const def of ACHIEVEMENT_SEED_DATA) {
		await db
			.insert(achievement_definitions)
			.values(def)
			.onConflictDoNothing({ target: achievement_definitions.id });
	}

	console.log(`Seeded ${ACHIEVEMENT_SEED_DATA.length} achievement definitions.`);
}
