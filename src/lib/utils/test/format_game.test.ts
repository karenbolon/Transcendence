import { describe, it, expect } from 'vitest';
import { formatMode, speedEmoji, formatTournamentFormat, calcWinRate, modeEmoji } from '../format_game';

describe('formatMode', () => {
	it('should format known modes', () => {
		expect(formatMode('local')).toBe('Local PvP');
		expect(formatMode('computer')).toBe('vs Computer');
		expect(formatMode('online')).toBe('Online');
	});

	it('should return raw string for unknown mode', () => {
		expect(formatMode('custom')).toBe('custom');
	});
});

describe('speedEmoji', () => {
	it('should return correct emoji for each preset', () => {
		expect(speedEmoji('chill')).toBe('🐢');
		expect(speedEmoji('normal')).toBe('🏓');
		expect(speedEmoji('fast')).toBe('🔥');
	});

	it('should return empty string for unknown preset', () => {
		expect(speedEmoji('turbo')).toBe('');
	});
});

describe('formatTournamentFormat', () => {
	it('should format known formats', () => {
		expect(formatTournamentFormat('single_elimination')).toBe('Single elimination');
		expect(formatTournamentFormat('double_elimination')).toBe('Double elimination');
		expect(formatTournamentFormat('round_robin')).toBe('Round robin');
	});

	it('should return raw string for unknown format', () => {
		expect(formatTournamentFormat('swiss')).toBe('swiss');
	});
});

describe('calcWinRate', () => {
	it('should calculate correct win rate', () => {
		expect(calcWinRate(7, 10)).toBe(70);
		expect(calcWinRate(1, 3)).toBe(33);
		expect(calcWinRate(10, 10)).toBe(100);
	});

	it('should return 0 for zero total games', () => {
		expect(calcWinRate(0, 0)).toBe(0);
	});

	it('should return 0 for zero wins', () => {
		expect(calcWinRate(0, 5)).toBe(0);
	});

	it('should round to nearest integer', () => {
		expect(calcWinRate(1, 3)).toBe(33);
		expect(calcWinRate(2, 3)).toBe(67);
	});
});

describe('modeEmoji', () => {
	it('should return emoji + label for known modes', () => {
		expect(modeEmoji('local')).toBe('👥 Local');
		expect(modeEmoji('online')).toBe('🌐 Online');
		expect(modeEmoji('computer')).toBe('🤖 Computer');
	});

	it('should return empty string for unknown mode', () => {
		expect(modeEmoji('ai')).toBe('');
	});
});
