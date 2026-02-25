/**
 * Achievement Evaluation Logic
 *
 * Pure function — takes progression state and returns newly unlocked achievement IDs.
 * No database access.
 */

export interface ProgressionStats {
    shutout_wins: number;
    best_win_streak: number;
    total_points_scored: number;
    comeback_wins: number;
    total_ball_returns: number;
    games_played: number; // from users table
}

interface AchievementCondition {
    id: string;
    field: keyof ProgressionStats;
    threshold: number;
}

/**
 * All achievement conditions.
 * Each maps an achievement_definitions.id to a stat field and threshold.
 */
const ACHIEVEMENT_CONDITIONS: AchievementCondition[] = [
    // Shutout achievements
    { id: 'shutout_bronze', field: 'shutout_wins', threshold: 1 },
    { id: 'shutout_silver', field: 'shutout_wins', threshold: 10 },
    { id: 'shutout_gold', field: 'shutout_wins', threshold: 50 },

    // Streak achievements
    { id: 'streak_bronze', field: 'best_win_streak', threshold: 3 },
    { id: 'streak_silver', field: 'best_win_streak', threshold: 7 },
    { id: 'streak_gold', field: 'best_win_streak', threshold: 15 },

    // Origins (Low match counts)
    { id: 'matches_10', field: 'games_played', threshold: 10 },
    { id: 'matches_50', field: 'games_played', threshold: 50 },

    // Veteran achievements (High match counts)
    { id: 'matches_v_100', field: 'games_played', threshold: 100 },
    { id: 'matches_v_250', field: 'games_played', threshold: 250 },
    { id: 'matches_v_500', field: 'games_played', threshold: 500 },

    // Scorer achievements
    { id: 'points_bronze', field: 'total_points_scored', threshold: 50 },
    { id: 'points_silver', field: 'total_points_scored', threshold: 250 },
    { id: 'points_gold', field: 'total_points_scored', threshold: 1000 },

    // Comeback achievements
    { id: 'comeback_bronze', field: 'comeback_wins', threshold: 1 },
    { id: 'comeback_silver', field: 'comeback_wins', threshold: 5 },
    { id: 'comeback_gold', field: 'comeback_wins', threshold: 20 },

    // Rally achievements
    { id: 'rally_bronze', field: 'total_ball_returns', threshold: 100 },
    { id: 'rally_silver', field: 'total_ball_returns', threshold: 500 },
    { id: 'rally_gold', field: 'total_ball_returns', threshold: 2000 },
];

/**
 * Evaluate which achievements a player has newly earned.
 *
 * @param stats - Current progression stats (AFTER this match's updates)
 * @param existingAchievementIds - Achievement IDs the player already has
 * @returns Array of newly unlocked achievement IDs
 */
export function evaluateAchievements(
    stats: ProgressionStats,
    existingAchievementIds: Set<string>
): string[] {
    const newlyUnlocked: string[] = [];

    for (const condition of ACHIEVEMENT_CONDITIONS) {
        // Skip if already unlocked
        if (existingAchievementIds.has(condition.id)) continue;

        // Check if the threshold is met
        const value = stats[condition.field];
        if (value >= condition.threshold) {
            newlyUnlocked.push(condition.id);
        }
    }

    return newlyUnlocked;
}
