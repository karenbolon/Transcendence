import { describe, it, expect } from 'vitest';
import { evaluateAchievements, type ProgressionStats } from './achievements';

describe('Achievement Evaluation Logic (achievements.ts)', () => {
    const defaultStats: ProgressionStats = {
        shutout_wins: 0,
        best_win_streak: 0,
        total_points_scored: 0,
        comeback_wins: 0,
        total_ball_returns: 0,
        games_played: 0
    };

    it('should unlock basic achievements at thresholds', () => {
        const stats: ProgressionStats = {
            ...defaultStats,
            shutout_wins: 1, // bronze threshold
            best_win_streak: 3, // bronze threshold
        };

        const unlocked = evaluateAchievements(stats, new Set());

        expect(unlocked).toContain('shutout_bronze');
        expect(unlocked).toContain('streak_bronze');
        expect(unlocked.length).toBe(2);
    });

    it('should not unlock already earned achievements', () => {
        const stats: ProgressionStats = {
            ...defaultStats,
            shutout_wins: 1
        };

        const existing = new Set(['shutout_bronze']);
        const unlocked = evaluateAchievements(stats, existing);

        expect(unlocked).not.toContain('shutout_bronze');
        expect(unlocked.length).toBe(0);
    });

    it('should unlock higher tiers and skip lower ones if newly met', () => {
        const stats: ProgressionStats = {
            ...defaultStats,
            best_win_streak: 15 // meets bronze (3), silver (7), and gold (15)
        };

        // If the user had NONE, they get all three
        const unlocked = evaluateAchievements(stats, new Set());
        expect(unlocked).toContain('streak_bronze');
        expect(unlocked).toContain('streak_silver');
        expect(unlocked).toContain('streak_gold');
    });

    it('should unlock multiple achievements for different fields', () => {
        const stats: ProgressionStats = {
            ...defaultStats,
            games_played: 10,
            total_points_scored: 50,
            total_ball_returns: 100
        };

        const unlocked = evaluateAchievements(stats, new Set());
        expect(unlocked).toContain('veteran_bronze');
        expect(unlocked).toContain('scorer_bronze');
        expect(unlocked).toContain('rally_bronze');
    });

    it('should unlock the "Legend" veteran achievement at 200 games', () => {
        const stats: ProgressionStats = {
            ...defaultStats,
            games_played: 200
        };

        const unlocked = evaluateAchievements(stats, new Set());
        expect(unlocked).toContain('veteran_gold');
    });
});
