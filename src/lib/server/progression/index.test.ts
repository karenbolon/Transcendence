import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { player_progression, achievements, achievement_definitions, users } from '../db/schema';
import { processMatchProgression } from './index';
import { eq } from 'drizzle-orm';
import { cleanDatabase, createTestUsers } from '../db/test_db/test-utils';

describe('Progression Orchestrator Integration (index.ts)', () => {
    beforeEach(async () => {
        await cleanDatabase();

        // Seed basic achievements needed for test
        await db.insert(achievement_definitions).values([
            { id: 'shutout_bronze', name: 'Shutout Bronze', description: 'Win with 0 points against you', tier: 'bronze', category: 'shutout', icon: '🛡️' },
            { id: 'streak_bronze', name: 'Streak Bronze', description: 'Win 3 games in a row', tier: 'bronze', category: 'streak', icon: '🔥' }
        ]);
    });

    it('should create a new progression record for a first-time player', async () => {
        const [user] = await createTestUsers(1);

        const result = await db.transaction(async (tx) => {
            return await processMatchProgression(tx, user.id, {
                won: true,
                player1Score: 10,
                player2Score: 5,
                winScore: 10,
                speedPreset: 'normal',
                ballReturns: 20,
                maxDeficit: 0,
                reachedDeuce: false
            });
        });

        expect(result.xpEarned).toBeGreaterThan(0);
        expect(result.newLevel).toBe(1);

        // Verify database state
        const [prog] = await db.select().from(player_progression).where(eq(player_progression.user_id, user.id));
        expect(prog).toBeDefined();
        expect(prog.total_points_scored).toBe(10);
        expect(prog.total_ball_returns).toBe(20);
        expect(prog.current_win_streak).toBe(1);
    });

    it('should update existing stats and award achievements', async () => {
        const [user] = await createTestUsers(1);

        // 1. Initial game
        await db.transaction(async (tx) => {
            await processMatchProgression(tx, user.id, {
                won: true,
                player1Score: 10,
                player2Score: 5,
                winScore: 10,
                speedPreset: 'normal',
                ballReturns: 10,
                maxDeficit: 0,
                reachedDeuce: false
            });
        });

        // 2. Second game (Shutout)
        const result = await db.transaction(async (tx) => {
            return await processMatchProgression(tx, user.id, {
                won: true,
                player1Score: 10,
                player2Score: 0, // Should trigger shutout_bronze
                winScore: 10,
                speedPreset: 'normal',
                ballReturns: 10,
                maxDeficit: 0,
                reachedDeuce: false
            });
        });

        expect(result.newAchievements).toHaveLength(1);
        expect(result.newAchievements[0].id).toBe('shutout_bronze');

        // Verify database
        const [prog] = await db.select().from(player_progression).where(eq(player_progression.user_id, user.id));
        expect(prog.shutout_wins).toBe(1);
        expect(prog.total_points_scored).toBe(20);
        expect(prog.current_win_streak).toBe(2);

        const earned = await db.select().from(achievements).where(eq(achievements.user_id, user.id));
        expect(earned).toHaveLength(1);
        expect(earned[0].achievement_id).toBe('shutout_bronze');
    });

    it('should track win streaks correctly', async () => {
        const [user] = await createTestUsers(1);

        const play = (won: boolean) => db.transaction(tx => processMatchProgression(tx, user.id, {
            won,
            player1Score: won ? 10 : 5,
            player2Score: won ? 5 : 10,
            winScore: 10,
            speedPreset: 'normal',
            ballReturns: 5,
            maxDeficit: 0,
            reachedDeuce: false
        }));

        await play(true);
        await play(true);
        const res3 = await play(true); // 3rd win - should trigger streak_bronze

        expect(res3.newAchievements.some(a => a.id === 'streak_bronze')).toBe(true);

        const [prog] = await db.select().from(player_progression).where(eq(player_progression.user_id, user.id));
        expect(prog.current_win_streak).toBe(3);
        expect(prog.best_win_streak).toBe(3);

        await play(false); // Lose
        const [progAfterLoss] = await db.select().from(player_progression).where(eq(player_progression.user_id, user.id));
        expect(progAfterLoss.current_win_streak).toBe(0);
        expect(progAfterLoss.best_win_streak).toBe(3);
    });
});
