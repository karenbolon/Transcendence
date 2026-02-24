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
    // 1. SHUTOUT (Skill)
    { id: 'shutout_bronze', name: 'Shutout', tier: 'bronze', category: 'shutout', icon: '🛡️', description: 'Win a match where your opponent scores 0 points' },
    { id: 'shutout_silver', name: 'Shutout Artist', tier: 'silver', category: 'shutout', icon: '🛡️', description: 'Win 10 shutout matches' },
    { id: 'shutout_gold', name: 'Perfect Machine', tier: 'gold', category: 'shutout', icon: '🛡️', description: 'Win 50 shutout matches' },

    // 2. HOT STREAK (Skill)
    { id: 'streak_bronze', name: 'Hot Streak', tier: 'bronze', category: 'streak', icon: '🔥', description: 'Win 3 matches in a row' },
    { id: 'streak_silver', name: 'On Fire', tier: 'silver', category: 'streak', icon: '🔥', description: 'Win 7 matches in a row' },
    { id: 'streak_gold', name: 'Unstoppable', tier: 'gold', category: 'streak', icon: '🔥', description: 'Win 15 matches in a row' },

    // 3. PROGRESSION (Origins)
    { id: 'level_bronze', name: 'Level Up!', tier: 'bronze', category: 'origins', icon: '🌀', description: 'Reach Level 5' },
    { id: 'level_silver', name: 'Level Enthusiast', tier: 'silver', category: 'origins', icon: '🌀', description: 'Reach Level 15' },
    { id: 'level_gold', name: 'Level Master', tier: 'gold', category: 'origins', icon: '🌀', description: 'Reach Level 25' },

    // 4. POINT COLLECTOR (Scorer)
    { id: 'points_bronze', name: 'Point Collector', tier: 'bronze', category: 'scorer', icon: '🎯', description: 'Score 50 career points' },
    { id: 'points_silver', name: 'Point Machine', tier: 'silver', category: 'scorer', icon: '🎯', description: 'Score 250 career points' },
    { id: 'points_gold', name: 'Point God', tier: 'gold', category: 'scorer', icon: '🎯', description: 'Score 1000 career points' },

    // 5. MATCH ENGAGEMENT (Origins & Veteran)
    { id: 'matches_10', name: 'Getting Started', tier: 'bronze', category: 'origins', icon: '🎾', description: 'Play 10 matches' },
    { id: 'matches_50', name: 'Regular', tier: 'silver', category: 'origins', icon: '🎾', description: 'Play 50 matches' },
    { id: 'matches_v_100', name: 'Veteran', tier: 'bronze', category: 'veteran', icon: '🎮', description: 'Play 100 matches' },
    { id: 'matches_v_250', name: 'Elite Veteran', tier: 'silver', category: 'veteran', icon: '🎮', description: 'Play 250 matches' },
    { id: 'matches_v_500', name: 'Living Legend', tier: 'gold', category: 'veteran', icon: '🎮', description: 'Play 500 matches' },
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

    console.log('✅ Successfully seeded 15 achievement definitions.');
}

seed()
    .catch((err) => {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await client.end();
    });
