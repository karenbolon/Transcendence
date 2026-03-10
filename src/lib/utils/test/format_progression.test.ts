import { describe, it, expect } from 'vitest';
import { getStreakInfo, getMilestone, xpPercent, getTierColor, capitalize } from '../format_progression';

describe('getStreakInfo', () => {
	it('should return fire for 5+ streak', () => {
		const info = getStreakInfo(5);
		expect(info.emoji).toBe('💫');
		expect(info.label).toBe('5 wins');
	});

	it('should return fire for 3-4 streak', () => {
		const info = getStreakInfo(3);
		expect(info.emoji).toBe('🔥');
		expect(info.label).toBe('3 wins');
	});

	it('should return bolt for 1-2 streak', () => {
		const info = getStreakInfo(1);
		expect(info.emoji).toBe('⚡');
		expect(info.label).toBe('1 win');
	});

	it('should return ice for 0 streak', () => {
		const info = getStreakInfo(0);
		expect(info.emoji).toContain('❄️');
		expect(info.label).toBe('0 wins');
	});

	it('should handle singular win label', () => {
		expect(getStreakInfo(1).label).toBe('1 win');
		expect(getStreakInfo(2).label).toBe('2 wins');
	});
});

describe('getMilestone', () => {
	it('should return Transcendent for level 50+', () => {
		expect(getMilestone(50).title).toBe('Transcendent');
		expect(getMilestone(99).title).toBe('Transcendent');
	});

	it('should return Legend for level 30-49', () => {
		expect(getMilestone(30).title).toBe('Legend');
		expect(getMilestone(49).title).toBe('Legend');
	});

	it('should return Diamond for level 20-29', () => {
		expect(getMilestone(20).title).toBe('Diamond');
	});

	it('should return Flame for level 10-19', () => {
		expect(getMilestone(10).title).toBe('Flame');
	});

	it('should return Spark for level 5-9', () => {
		expect(getMilestone(5).title).toBe('Spark');
	});

	it('should return Seedling for level 0-4', () => {
		expect(getMilestone(0).title).toBe('Seedling');
		expect(getMilestone(4).title).toBe('Seedling');
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
		expect(getTierColor(50).label).toBe('legendary');
	});

	it('should return epic for level 30-49', () => {
		expect(getTierColor(30).label).toBe('epic');
	});

	it('should return gold for level 20-29', () => {
		expect(getTierColor(20).label).toBe('gold');
	});

	it('should return silver for level 10-19', () => {
		expect(getTierColor(10).label).toBe('silver');
	});

	it('should return bronze for level 0-9', () => {
		expect(getTierColor(0).label).toBe('bronze');
		expect(getTierColor(9).label).toBe('bronze');
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
