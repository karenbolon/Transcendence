/**
 * XP Calculation and Leveling Logic
 *
 * Pure functions — no database access.
 * All XP/level math lives here so it's easy to test and tweak.
 */

// ─── Types ──────────────────────────────────────────────────

export interface MatchResult {
    won: boolean;
    player1Score: number;
    player2Score: number;
    winScore: number;
    speedPreset: 'chill' | 'normal' | 'fast';
    currentWinStreak: number; // streak BEFORE this match
    ballReturns: number;
    maxDeficit: number;
}

export interface XpBreakdown {
    base: number;
    bonuses: { name: string; amount: number }[];
    total: number;
}

export interface LevelInfo {
    level: number;
    xpIntoLevel: number;
    xpForNextLevel: number;
}

// ─── Level Milestones ───────────────────────────────────────

const MILESTONE_ICONS: Record<number, { icon: string; title: string }> = {
    0: { icon: '🌱', title: 'Seedling' },
    5: { icon: '⚡', title: 'Spark' },
    10: { icon: '🔥', title: 'Flame' },
    20: { icon: '💎', title: 'Diamond' },
    30: { icon: '🦄', title: 'Legend' },
    50: { icon: '👑', title: 'Transcendent' },
};

// ─── XP Thresholds ──────────────────────────────────────────
// Each entry is the TOTAL XP needed to reach that level.
// Generated with: round(50 * 1.3^level)

const XP_TABLE_SIZE = 100; // support up to level 100
const BASE_XP = 50;
const GROWTH_FACTOR = 1.3;

let _xpThresholds: number[] | null = null;

function getXpThresholds(): number[] {
    if (_xpThresholds) return _xpThresholds;

    _xpThresholds = [0]; // level 0 = 0 XP
    let cumulative = 0;
    for (let i = 1; i <= XP_TABLE_SIZE; i++) {
        const xpForThisLevel = Math.round(BASE_XP * Math.pow(GROWTH_FACTOR, i - 1));
        cumulative += xpForThisLevel;
        _xpThresholds.push(cumulative);
    }
    return _xpThresholds;
}

// ─── Public Functions ───────────────────────────────────────

/**
 * Calculate how much XP a player earns from a single match.
 */
export function calculateMatchXp(result: MatchResult): XpBreakdown {
    const bonuses: { name: string; amount: number }[] = [];

    // Base XP: win vs loss
    const base = result.won ? 50 : 20;

    // Shutout bonus: won and opponent scored 0
    if (result.won && result.player2Score === 0) {
        bonuses.push({ name: 'Shutout', amount: 15 });
    }

    // Streak bonus: +5 per consecutive win (cap 25)
    // currentWinStreak is the streak AFTER this match's win is counted
    if (result.won && result.currentWinStreak > 0) {
        const streakBonus = Math.min(result.currentWinStreak * 5, 25);
        bonuses.push({ name: 'Win Streak', amount: streakBonus });
    }

    // Comeback bonus: won after being down by 2+
    if (result.won && result.maxDeficit >= 2) {
        bonuses.push({ name: 'Comeback', amount: 10 });
    }

    // Speed bonus
    const speedBonusMap: Record<string, number> = { chill: 0, normal: 5, fast: 10 };
    const speedBonus = speedBonusMap[result.speedPreset] ?? 0;
    if (speedBonus > 0) {
        bonuses.push({ name: 'Speed Bonus', amount: speedBonus });
    }

    const total = base + bonuses.reduce((sum, b) => sum + b.amount, 0);

    return { base, bonuses, total };
}

/**
 * Given a total XP amount, determine the player's level and progress.
 */
export function getLevelForXp(totalXp: number): LevelInfo {
    const thresholds = getXpThresholds();

    let level = 0;
    for (let i = 1; i < thresholds.length; i++) {
        if (totalXp >= thresholds[i]) {
            level = i;
        } else {
            break;
        }
    }

    const xpAtCurrentLevel = thresholds[level] ?? 0;
    const xpAtNextLevel = thresholds[level + 1] ?? thresholds[level] + 1000;

    return {
        level,
        xpIntoLevel: totalXp - xpAtCurrentLevel,
        xpForNextLevel: xpAtNextLevel - xpAtCurrentLevel,
    };
}

/**
 * Get the milestone icon and title for a given level.
 * Returns the highest milestone the player has reached.
 */
export function getMilestoneForLevel(level: number): { icon: string; title: string } {
    const milestoneKeys = Object.keys(MILESTONE_ICONS)
        .map(Number)
        .sort((a, b) => b - a); // descending

    for (const key of milestoneKeys) {
        if (level >= key) {
            return MILESTONE_ICONS[key];
        }
    }

    return MILESTONE_ICONS[0];
}

/**
 * Get the XP required (cumulative) to reach a specific level.
 */
export function getXpRequiredForLevel(level: number): number {
    const thresholds = getXpThresholds();
    return thresholds[level] ?? 0;
}
