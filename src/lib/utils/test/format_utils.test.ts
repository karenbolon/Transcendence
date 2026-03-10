import { describe, it, expect } from 'vitest';
import { mapProgressionRow, getDisplayName } from '../format_utils';

describe('mapProgressionRow', () => {
	it('should map DB row to Progression type', () => {
		const result = mapProgressionRow({
			current_level: 5,
			current_xp: 250,
			xp_to_next_level: 500,
		});

		expect(result).toEqual({
			level: 5,
			currentXp: 250,
			xpToNextLevel: 500,
		});
	});

	it('should handle level 1 defaults', () => {
		const result = mapProgressionRow({
			current_level: 1,
			current_xp: 0,
			xp_to_next_level: 100,
		});

		expect(result.level).toBe(1);
		expect(result.currentXp).toBe(0);
	});
});

describe('getDisplayName', () => {
	it('should return displayName when available', () => {
		expect(getDisplayName({ displayName: 'Alice', username: 'alice99' })).toBe('Alice');
	});

	it('should fall back to username when displayName is null', () => {
		expect(getDisplayName({ displayName: null, username: 'alice99' })).toBe('alice99');
	});

	it('should fall back to username when displayName is undefined', () => {
		expect(getDisplayName({ username: 'bob' })).toBe('bob');
	});

	it('should fall back to username when displayName is empty', () => {
		expect(getDisplayName({ displayName: '', username: 'charlie' })).toBe('charlie');
	});
});
