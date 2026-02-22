/**
 * Progression Orchestrator
 *
 * Coordinates the full post-match progression update within a DB transaction.
 * This is the single entry point called by the match-saving API.
 */

import { eq, sql } from 'drizzle-orm';
import { player_progression, achievements, achievement_definitions, users } from '$lib/server/db/schema';
import { calculateMatchXp, getLevelForXp, type MatchResult, type XpBreakdown } from './xp';
import { evaluateAchievements, type ProgressionStats } from './achievements';
import type { PostgresJsTransaction } from 'drizzle-orm/postgres-js';

// ─── Types ──────────────────────────────────────────────────

export interface MatchProgressionInput {
    won: boolean;
    player1Score: number;
    player2Score: number;
    winScore: number;
    speedPreset: 'chill' | 'normal' | 'fast';
    ballReturns: number;
    maxDeficit: number;
    reachedDeuce: boolean;
}

export interface ProgressionResult {
    xpEarned: number;
    bonuses: { name: string; amount: number }[];
    oldLevel: number;
    newLevel: number;
    currentXp: number;
    xpForNextLevel: number;
    newAchievements: {
        id: string;
        name: string;
        description: string;
        tier: string;
    }[];
}

// ─── Main Function ──────────────────────────────────────────

/**
 * Process all progression updates for a completed match.
 * Must be called within an existing database transaction.
 */
export async function processMatchProgression(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: PostgresJsTransaction<any, any>,
    userId: number,
    input: MatchProgressionInput
): Promise<ProgressionResult> {
    // 1. Read or create progression row
    const [existingRow] = await tx
        .select()
        .from(player_progression)
        .where(eq(player_progression.user_id, userId));

    const isFirstGame = !existingRow;

    // Current stats (before this match)
    const currentStats = existingRow ?? {
        user_id: userId,
        current_level: 0,
        current_xp: 0,
        total_game_xp: 0,
        total_xp: 0,
        xp_to_next_level: 50,
        current_win_streak: 0,
        best_win_streak: 0,
        total_points_scored: 0,
        total_ball_returns: 0,
        shutout_wins: 0,
        comeback_wins: 0,
        consecutive_days_played: 0,
        last_played_at: null,
    };

    // 2. Update cumulative stats
    const newWinStreak = input.won ? currentStats.current_win_streak + 1 : 0;
    const newBestStreak = Math.max(currentStats.best_win_streak, newWinStreak);
    const newTotalPoints = currentStats.total_points_scored + input.player1Score;
    const newBallReturns = currentStats.total_ball_returns + input.ballReturns;
    const isShutout = input.won && input.player2Score === 0;
    const newShutoutWins = currentStats.shutout_wins + (isShutout ? 1 : 0);
    const isComeback = input.won && input.maxDeficit >= 2;
    const newComebackWins = currentStats.comeback_wins + (isComeback ? 1 : 0);

    // 3. Calculate XP
    const matchResult: MatchResult = {
        won: input.won,
        player1Score: input.player1Score,
        player2Score: input.player2Score,
        winScore: input.winScore,
        speedPreset: input.speedPreset,
        currentWinStreak: newWinStreak,
        ballReturns: input.ballReturns,
        maxDeficit: input.maxDeficit,
    };

    const xpBreakdown: XpBreakdown = calculateMatchXp(matchResult);
    const oldTotalXp = currentStats.total_xp;
    const newTotalXp = oldTotalXp + xpBreakdown.total;

    // 4. Determine levels
    const oldLevelInfo = getLevelForXp(oldTotalXp);
    const newLevelInfo = getLevelForXp(newTotalXp);

    // 5. Consecutive days tracking
    const now = new Date();
    let newConsecutiveDays = currentStats.consecutive_days_played;
    if (currentStats.last_played_at) {
        const lastPlayed = new Date(currentStats.last_played_at);
        const diffHours = (now.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60);
        if (diffHours >= 20 && diffHours <= 48) {
            // Played "next day" (between 20h and 48h gap)
            newConsecutiveDays++;
        } else if (diffHours > 48) {
            // Streak broken
            newConsecutiveDays = 1;
        }
        // If < 20h, same day — don't increment
    } else {
        newConsecutiveDays = 1;
    }

    // 6. Upsert progression row
    const progressionData = {
        current_level: newLevelInfo.level,
        current_xp: newLevelInfo.xpIntoLevel,
        total_game_xp: currentStats.total_game_xp + xpBreakdown.total,
        total_xp: newTotalXp,
        xp_to_next_level: newLevelInfo.xpForNextLevel,
        current_win_streak: newWinStreak,
        best_win_streak: newBestStreak,
        total_points_scored: newTotalPoints,
        total_ball_returns: newBallReturns,
        shutout_wins: newShutoutWins,
        comeback_wins: newComebackWins,
        consecutive_days_played: newConsecutiveDays,
        last_played_at: now,
    };

    if (isFirstGame) {
        await tx.insert(player_progression).values({
            user_id: userId,
            ...progressionData,
        });
    } else {
        await tx
            .update(player_progression)
            .set(progressionData)
            .where(eq(player_progression.user_id, userId));
    }

    // 7. Get the user's games_played count for achievement evaluation
    const [userRow] = await tx
        .select({ games_played: users.games_played })
        .from(users)
        .where(eq(users.id, userId));

    // 8. Evaluate achievements
    const existingAchievements = await tx
        .select({ achievement_id: achievements.achievement_id })
        .from(achievements)
        .where(eq(achievements.user_id, userId));

    const existingIds = new Set(existingAchievements.map(a => a.achievement_id));

    const stats: ProgressionStats = {
        shutout_wins: newShutoutWins,
        best_win_streak: newBestStreak,
        total_points_scored: newTotalPoints,
        comeback_wins: newComebackWins,
        total_ball_returns: newBallReturns,
        games_played: userRow?.games_played ?? 0,
    };

    const newAchievementIds = evaluateAchievements(stats, existingIds);

    // 9. Insert newly unlocked achievements
    if (newAchievementIds.length > 0) {
        await tx.insert(achievements).values(
            newAchievementIds.map(id => ({
                user_id: userId,
                achievement_id: id,
            }))
        );
    }

    // 10. Fetch definitions for newly unlocked achievements (for the response)
    let newAchievementDetails: { id: string; name: string; description: string; tier: string }[] = [];
    if (newAchievementIds.length > 0) {
        const defs = await tx
            .select()
            .from(achievement_definitions)
            .where(sql`${achievement_definitions.id} = ANY(${newAchievementIds})`);

        newAchievementDetails = defs.map(d => ({
            id: d.id,
            name: d.name,
            description: d.description,
            tier: d.tier,
        }));
    }

    return {
        xpEarned: xpBreakdown.total,
        bonuses: [{ name: 'Base', amount: xpBreakdown.base }, ...xpBreakdown.bonuses],
        oldLevel: oldLevelInfo.level,
        newLevel: newLevelInfo.level,
        currentXp: newLevelInfo.xpIntoLevel,
        xpForNextLevel: newLevelInfo.xpForNextLevel,
        newAchievements: newAchievementDetails,
    };
}
