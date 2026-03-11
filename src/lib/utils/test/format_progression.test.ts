import { describe, it, expect } from 'vitest';
import { getStreakInfo, getMilestone, xpPercent, getTierColor, capitalize } from '../format_progression';

describe('getStreakInfo', () => {
	it('should return fire for 5+ streak', () => {
		const info = getStreakInfo(5);
		expect(info.emoji).toBe('💫');
		expect(info.labelKey).toBe('user_profile.streak.wins');
		expect(info.count).toBe(5);
	});

	it('should return fire for 3-4 streak', () => {
		const info = getStreakInfo(3);
		expect(info.emoji).toBe('🔥');
		expect(info.labelKey).toBe('user_profile.streak.wins');
		expect(info.count).toBe(3);
	});

	it('should return bolt for 1-2 streak', () => {
		const info = getStreakInfo(1);
		expect(info.emoji).toBe('⚡');
		expect(info.labelKey).toBe('user_profile.streak.wins');
		expect(info.count).toBe(1);
	});

	it('should return ice for 0 streak', () => {
		const info = getStreakInfo(0);
		expect(info.emoji).toContain('❄️');
		expect(info.labelKey).toBe('user_profile.streak.wins');
		expect(info.count).toBe(0);
	});

	it('should return correct count', () => {
		expect(getStreakInfo(1).count).toBe(1);
		expect(getStreakInfo(2).count).toBe(2);
	});
});

describe('getMilestone', () => {
	it('should return Transcendent for level 50+', () => {
		expect(getMilestone(50).titleKey).toBe('user_profile.milestones.transcendent');
		expect(getMilestone(99).titleKey).toBe('user_profile.milestones.transcendent');
	});

	it('should return Legend for level 30-49', () => {
		expect(getMilestone(30).titleKey).toBe('user_profile.milestones.legend');
		expect(getMilestone(49).titleKey).toBe('user_profile.milestones.legend');
	});

	it('should return Diamond for level 20-29', () => {
		expect(getMilestone(20).titleKey).toBe('user_profile.milestones.diamond');
	});

	it('should return Flame for level 10-19', () => {
		expect(getMilestone(10).titleKey).toBe('user_profile.milestones.flame');
	});

	it('should return Spark for level 5-9', () => {
		expect(getMilestone(5).titleKey).toBe('user_profile.milestones.spark');
	});

	it('should return Seedling for level 0-4', () => {
		expect(getMilestone(0).titleKey).toBe('user_profile.milestones.seedling');
		expect(getMilestone(4).titleKey).toBe('user_profile.milestones.seedling');
	});
});

describe('xpPercent', () => {
	it('should calculate correct percentage', () => {
		expect(xpPercent(50, 100)).toBe(50);
		expect(xpPercent(75, 100)).toBe(75);
	});

	it('should cap at 100', () => {
		expect(xpPercent(150, 100)).toBe(100);
	});

	it('should return 0 when xpToNextLevel is 0', () => {
		expect(xpPercent(50, 0)).toBe(0);
	});

	it('should round to nearest integer', () => {
		expect(xpPercent(1, 3)).toBe(33);
		expect(xpPercent(2, 3)).toBe(67);
	});
});

describe('getTierColor', () => {
	it('should return legendary for level 50+', () => {
		expect(getTierColor(50).labelKey).toBe('user_profile.tiers.legendary');
	});

	it('should return epic for level 30-49', () => {
		expect(getTierColor(30).labelKey).toBe('user_profile.tiers.epic');
	});

	it('should return gold for level 20-29', () => {
		expect(getTierColor(20).labelKey).toBe('user_profile.tiers.gold');
	});

	it('should return silver for level 10-19', () => {
		expect(getTierColor(10).labelKey).toBe('user_profile.tiers.silver');
	});

	it('should return bronze for level 0-9', () => {
		expect(getTierColor(0).labelKey).toBe('user_profile.tiers.bronze');
		expect(getTierColor(9).labelKey).toBe('user_profile.tiers.bronze');
	});

	it('should return from and to colors', () => {
		const tier = getTierColor(50);
		expect(tier.from).toBeDefined();
		expect(tier.to).toBeDefined();
	});
});

describe('capitalize', () => {
	it('should capitalize first letter', () => {
		expect(capitalize('hello')).toBe('Hello');
		expect(capitalize('world')).toBe('World');
	});

	it('should handle already capitalized', () => {
		expect(capitalize('Hello')).toBe('Hello');
	});

	it('should handle single character', () => {
		expect(capitalize('a')).toBe('A');
	});

	it('should handle empty string', () => {
		expect(capitalize('')).toBe('');
	});
});
