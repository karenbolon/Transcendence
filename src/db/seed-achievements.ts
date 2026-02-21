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
    { id: 'shutout_bronze', name: 'Shutout', tier: 'bronze', description: 'Win a match where your opponent scores 0 points' },
    { id: 'shutout_silver', name: 'Shutout Artist', tier: 'silver', description: 'Win 5 shutout matches' },
    { id: 'shutout_gold', name: 'Perfect Machine', tier: 'gold', description: 'Win 10 shutout matches' },

    // 2. HOT STREAK (Skill)
    { id: 'streak_bronze', name: 'Hot Streak', tier: 'bronze', description: 'Win 3 matches in a row' },
    { id: 'streak_silver', name: 'On Fire', tier: 'silver', description: 'Win 7 matches in a row' },
    { id: 'streak_gold', name: 'Unstoppable', tier: 'gold', description: 'Win 15 matches in a row' },

    // 3. PROGRESSION (Milestone)
    { id: 'level_bronze', name: 'First Steps', tier: 'bronze', description: 'Reach Level 5' },
    { id: 'level_silver', name: 'Rising Star', tier: 'silver', description: 'Reach Level 15' },
    { id: 'level_gold', name: 'Pixie Unicorn', tier: 'gold', description: 'Reach Level 25' },

    // 4. POINT COLLECTOR (Milestone)
    { id: 'points_bronze', name: 'Point Collector', tier: 'bronze', description: 'Score 500 career points' },
    { id: 'points_silver', name: 'Point Machine', tier: 'silver', description: 'Score 5,000 career points' },
    { id: 'points_gold', name: 'Point God', tier: 'gold', description: 'Score 25,000 career points' },

    // 5. MATCH ENGAGEMENT (Engagement)
    { id: 'matches_bronze', name: 'Getting Started', tier: 'bronze', description: 'Play 10 matches' },
    { id: 'matches_silver', name: 'Regular', tier: 'silver', description: 'Play 100 matches' },
    { id: 'matches_gold', name: 'Dedicated', tier: 'gold', description: 'Play 500 matches' },
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
