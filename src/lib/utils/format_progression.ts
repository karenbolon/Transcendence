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
	{ minLevel: 50, icon: '👑', titleKey: 'user_profile.milestones.transcendent' },
	{ minLevel: 30, icon: '🦄', titleKey: 'user_profile.milestones.legend' },
	{ minLevel: 20, icon: '💎', titleKey: 'user_profile.milestones.diamond' },
	{ minLevel: 10, icon: '🔥', titleKey: 'user_profile.milestones.flame' },
	{ minLevel: 5,  icon: '⚡', titleKey: 'user_profile.milestones.spark' },
	{ minLevel: 0,  icon: '🌱', titleKey: 'user_profile.milestones.seedling' },
] as const;

export function getStreakInfo(streak: number): { emoji: string; labelKey: string; count: number } {
	let emoji: string;
	if (streak >= 5) emoji = '💫';
	else if (streak >= 3) emoji = '🔥';
	else if (streak >= 1) emoji = '⚡';
	else emoji = '❄️ ';

	return {
			emoji,
			labelKey: 'user_profile.streak.wins',
			count: streak
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
	if (level >= 50) return { from: '#ffd700', to: '#ff8c00', labelKey: 'user_profile.tiers.legendary' };
	if (level >= 30) return { from: '#a855f7', to: '#7c3aed', labelKey: 'user_profile.tiers.epic' };
	if (level >= 20) return { from: '#ff6b9d', to: '#e84393', labelKey: 'user_profile.tiers.gold' };
	if (level >= 10) return { from: '#60a5fa', to: '#3b82f6', labelKey: 'user_profile.tiers.silver' };
	return { from: '#4ade80', to: '#22c55e', labelKey: 'user_profile.tiers.bronze' };
};

export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
};

export const CATEGORYLABELS: Record<string, string> = {
	onboarding: 'user_profile.categories.onboarding',
	social: 'user_profile.categories.social',
	origins: 'user_profile.categories.origins',
	tournament: 'user_profile.categories.tournament',
	shutout: 'user_profile.categories.shutout',
	streak: 'user_profile.categories.streak',
	scorer: 'user_profile.categories.scorer',
	veteran: 'user_profile.categories.veteran',
	comeback: 'user_profile.categories.comeback',
	rally: 'user_profile.categories.rally',
	secret: 'user_profile.categories.secret',
};

export const DEFAULT_PROGRESSION: Progression = {
	level: 1,
	currentXp: 0,
	xpToNextLevel: 100,
};