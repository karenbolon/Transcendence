import { describe, it, expect } from 'vitest';
import { calculateMatchXp, getLevelForXp, getMilestoneForLevel } from './xp';

describe('XP Calculation Logic (xp.ts)', () => {
    describe('calculateMatchXp', () => {
        it('should award 50 XP for a win', () => {
            const result = calculateMatchXp({
                won: true,
                player1Score: 10,
                player2Score: 5,
                winScore: 10,
                speedPreset: 'chill',
                currentWinStreak: 0,
                ballReturns: 0,
                maxDeficit: 0
            });
            expect(result.base).toBe(50);
            expect(result.total).toBe(50);
        });

        it('should award 20 XP for a loss', () => {
            const result = calculateMatchXp({
                won: false,
                player1Score: 5,
                player2Score: 10,
                winScore: 10,
                speedPreset: 'chill',
                currentWinStreak: 0,
                ballReturns: 0,
                maxDeficit: 0
            });
            expect(result.base).toBe(20);
            expect(result.total).toBe(20);
        });

        it('should apply shutout bonus (+15)', () => {
            const result = calculateMatchXp({
                won: true,
                player1Score: 10,
                player2Score: 0,
                winScore: 10,
                speedPreset: 'chill',
                currentWinStreak: 0,
                ballReturns: 0,
                maxDeficit: 0
            });
            expect(result.bonuses).toContainEqual({ name: 'Shutout', amount: 15 });
            expect(result.total).toBe(65);
        });

        it('should apply streak bonus (+5 per win, cap 25)', () => {
            // Test streak of 3 wins (including this one)
            const result3 = calculateMatchXp({
                won: true,
                player1Score: 10,
                player2Score: 5,
                winScore: 10,
                speedPreset: 'chill',
                currentWinStreak: 3,
                ballReturns: 0,
                maxDeficit: 0
            });
            expect(result3.bonuses).toContainEqual({ name: 'Win Streak', amount: 15 });

            // Test streak cap (6 wins = 30XP, but should cap at 25XP)
            const resultCap = calculateMatchXp({
                won: true,
                player1Score: 10,
                player2Score: 5,
                winScore: 10,
                speedPreset: 'chill',
                currentWinStreak: 6,
                ballReturns: 0,
                maxDeficit: 0
            });
            expect(resultCap.bonuses).toContainEqual({ name: 'Win Streak', amount: 25 });
        });

        it('should apply comeback bonus (+10)', () => {
            const result = calculateMatchXp({
                won: true,
                player1Score: 10,
                player2Score: 8,
                winScore: 10,
                speedPreset: 'chill',
                currentWinStreak: 0,
                ballReturns: 0,
                maxDeficit: 2
            });
            expect(result.bonuses).toContainEqual({ name: 'Comeback', amount: 10 });
            expect(result.total).toBe(60);
        });

        it('should apply speed bonuses (Normal: +5, Fast: +10)', () => {
            const resultNormal = calculateMatchXp({
                won: true,
                player1Score: 10,
                player2Score: 5,
                winScore: 10,
                speedPreset: 'normal',
                currentWinStreak: 0,
                ballReturns: 0,
                maxDeficit: 0
            });
            expect(resultNormal.bonuses).toContainEqual({ name: 'Speed Bonus', amount: 5 });

            const resultFast = calculateMatchXp({
                won: true,
                player1Score: 10,
                player2Score: 5,
                winScore: 10,
                speedPreset: 'fast',
                currentWinStreak: 0,
                ballReturns: 0,
                maxDeficit: 0
            });
            expect(resultFast.bonuses).toContainEqual({ name: 'Speed Bonus', amount: 10 });
        });
    });

    describe('getLevelForXp', () => {
        it('should return level 0 for 0 XP', () => {
            const info = getLevelForXp(0);
            expect(info.level).toBe(0);
            expect(info.xpIntoLevel).toBe(0);
            expect(info.xpForNextLevel).toBe(50);
        });

        it('should return level 1 when threshold is met (50 XP)', () => {
            const info = getLevelForXp(50);
            expect(info.level).toBe(1);
            expect(info.xpIntoLevel).toBe(0);
        });

        it('should correctly calculate progress into a level', () => {
            // Level 1 starts at 50. Level 2 starts at 50 + (50 * 1.3^0) = 50 + 50 = 100.
            // (Note: getXpThresholds uses BASE_XP * 1.3 ^ i-1)
            // L0: 0
            // L1: 50
            // L2: 50 + 65 = 115
            const info = getLevelForXp(75);
            expect(info.level).toBe(1);
            expect(info.xpIntoLevel).toBe(25); // 75 - 50 = 25
            expect(info.xpForNextLevel).toBe(65); // Threshold for L2 is 115. 115 - 50 = 65.
        });
    });

    describe('getMilestoneForLevel', () => {
        it('should return "Seedling" for level 0', () => {
            const milestone = getMilestoneForLevel(0);
            expect(milestone.title).toBe('Seedling');
        });

        it('should return "Flame" for level 10', () => {
            const milestone = getMilestoneForLevel(10);
            expect(milestone.title).toBe('Flame');
        });

        it('should return the "Legend" for level 40', () => {
            const milestone = getMilestoneForLevel(40);
            expect(milestone.title).toBe('Legend'); // 40 >= 30, but < 50
        });

        it('should return "Transcendent" for level 50+', () => {
            const milestone = getMilestoneForLevel(100);
            expect(milestone.title).toBe('Transcendent');
        });
    });
});
