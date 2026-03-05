import type { Progression } from "$lib/types/progression";

export const TIER_COLORS: Record<string, string> = {
	bronze: '#cd7f32',
	silver: '#c0c0d2',
	gold: '#ffd700',
	legendary: '#a855f7',
};

export const XP_REWARDS: Record<string, number> = {
	bronze: 50,
	silver: 100,
	gold: 200,
	legendary: 500,
};

export const TIER_EMOJIS: Record<string, string> = {
	bronze: '🥉',
	silver: '🥈',
	gold: '🥇',
	legendary: '👑',
};

export const RANK_MEDALS = ['🥇', '🥈', '🥉'] as const;

export const MILESTONES = [
	{ minLevel: 50, icon: '👑', title: 'Transcendent' },
	{ minLevel: 30, icon: '🦄', title: 'Legend' },
	{ minLevel: 20, icon: '💎', title: 'Diamond' },
	{ minLevel: 10, icon: '🔥', title: 'Flame' },
	{ minLevel: 5,  icon: '⚡', title: 'Spark' },
	{ minLevel: 0,  icon: '🌱', title: 'Seedling' },
] as const;

export function getStreakInfo(streak: number): { emoji: string; label: string } {
	let emoji: string;
	if (streak >= 5) emoji = '💫';
	else if (streak >= 3) emoji = '🔥';
	else if (streak >= 1) emoji = '⚡';
	else emoji = '❄️ ';

	return {
			emoji,
			label: `${streak} win${streak !== 1 ? 's' : ''}`,
	};
}

export function getMilestone(level: number) {
	return MILESTONES.find(m => level >= m.minLevel) ?? MILESTONES.at(-1)!;
};

export const RARITY_PERCENT: Record<string, string> = {
	bronze: '72%',
	silver: '38%',
	gold: '15%',
	legendary: '3%',
};

export function xpPercent(currentXp: number, xpToNextLevel: number): number {
	return xpToNextLevel > 0 ? Math.min(Math.round((currentXp / xpToNextLevel) * 100), 100) : 0;
};

export function getTierColor(level: number) {
	if (level >= 50) return { from: '#ffd700', to: '#ff8c00', label: 'legendary' };
	if (level >= 30) return { from: '#a855f7', to: '#7c3aed', label: 'epic' };
	if (level >= 20) return { from: '#ff6b9d', to: '#e84393', label: 'gold' };
	if (level >= 10) return { from: '#60a5fa', to: '#3b82f6', label: 'silver' };
	return { from: '#4ade80', to: '#22c55e', label: 'bronze' };
};

export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
};

export const CATEGORYLABELS: Record<string, string> = {
	onboarding: '⭐ Onboarding',
	social: '🤝 Social',
	origins: '🌀 Origins',
	tournament: '🏟️ Tournament',
	shutout: '🛡️ Shutout',
	streak: '🔥 Streaks',
	scorer: '🎯 Scorer',
	veteran: '🎮 Veteran',
	comeback: '💪 Comeback',
	rally: '🏓 Rally',
	secret: '🕵️ Secret',
};

export const DEFAULT_PROGRESSION: Progression = {
	level: 1,
	currentXp: 0,
	xpToNextLevel: 100,
};