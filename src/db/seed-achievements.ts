import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { achievement_definitions } from './schema';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL not found in environment!');
	process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

const achievements = [
	// ── Shutout ─────────────────────────────────
	{ id: 'shutout_bronze', name: 'Shutout', tier: 'bronze', category: 'shutout', icon: '🛡️', description: 'Win a match where your opponent scores 0 points' },
	{ id: 'shutout_silver', name: 'Shutout Artist', tier: 'silver', category: 'shutout', icon: '🛡️', description: 'Win 10 shutout matches' },
	{ id: 'shutout_gold', name: 'Perfect Machine', tier: 'gold', category: 'shutout', icon: '🛡️', description: 'Win 50 shutout matches' },

	// ── Streak ──────────────────────────────────
	{ id: 'streak_bronze', name: 'Hot Streak', tier: 'bronze', category: 'streak', icon: '🔥', description: 'Win 3 matches in a row' },
	{ id: 'streak_silver', name: 'On Fire', tier: 'silver', category: 'streak', icon: '🔥', description: 'Win 7 matches in a row' },
	{ id: 'streak_gold', name: 'Unstoppable', tier: 'gold', category: 'streak', icon: '🔥', description: 'Win 15 matches in a row' },

	// ── Origins (match milestones) ──────────────
	{ id: 'matches_10', name: 'Getting Started', tier: 'bronze', category: 'origins', icon: '🎾', description: 'Play 10 matches' },
	{ id: 'matches_50', name: 'Regular', tier: 'silver', category: 'origins', icon: '🎾', description: 'Play 50 matches' },

	// ── Veteran (high match counts) ─────────────
	{ id: 'matches_v_100', name: 'Veteran', tier: 'bronze', category: 'veteran', icon: '🎮', description: 'Play 100 matches' },
	{ id: 'matches_v_250', name: 'Elite Veteran', tier: 'silver', category: 'veteran', icon: '🎮', description: 'Play 250 matches' },
	{ id: 'matches_v_500', name: 'Living Legend', tier: 'gold', category: 'veteran', icon: '🎮', description: 'Play 500 matches' },

	// ── Scorer ──────────────────────────────────
	{ id: 'points_bronze', name: 'Point Collector', tier: 'bronze', category: 'scorer', icon: '🎯', description: 'Score 50 career points' },
	{ id: 'points_silver', name: 'Point Machine', tier: 'silver', category: 'scorer', icon: '🎯', description: 'Score 250 career points' },
	{ id: 'points_gold', name: 'Point God', tier: 'gold', category: 'scorer', icon: '🎯', description: 'Score 1000 career points' },

	// ── Comeback ────────────────────────────────
	{ id: 'comeback_bronze', name: 'Comeback Kid', tier: 'bronze', category: 'comeback', icon: '💪', description: 'Win a game after being down by 2+ points' },
	{ id: 'comeback_silver', name: 'Resilient', tier: 'silver', category: 'comeback', icon: '💪', description: 'Win 5 comeback games' },
	{ id: 'comeback_gold', name: 'Never Give Up', tier: 'gold', category: 'comeback', icon: '💪', description: 'Win 20 comeback games' },

	// ── Rally ───────────────────────────────────
	{ id: 'rally_bronze', name: 'Rally Player', tier: 'bronze', category: 'rally', icon: '🏓', description: 'Return the ball 100 times total' },
	{ id: 'rally_silver', name: 'Wall of Steel', tier: 'silver', category: 'rally', icon: '🏓', description: 'Return the ball 500 times total' },
	{ id: 'rally_gold', name: 'Immovable Object', tier: 'gold', category: 'rally', icon: '🏓', description: 'Return the ball 2000 times total' },
];

async function seed() {
	console.log('🌱 Seeding achievement definitions...');

	await db.insert(achievement_definitions)
		.values(achievements)
		.onConflictDoUpdate({
			target: achievement_definitions.id,
			set: {
				name: sql`excluded.name`,
				description: sql`excluded.description`,
				tier: sql`excluded.tier`,
				category: sql`excluded.category`,
				icon: sql`excluded.icon`,
			},
		});

	console.log(`✅ Successfully seeded ${achievements.length} achievement definitions.`);
}

seed()
	.catch((err) => {
		console.error('❌ Seeding failed:', err);
		process.exit(1);
	})
	.finally(async () => {
		await client.end();
	});
