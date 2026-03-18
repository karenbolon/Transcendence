import { describe, it, expect } from 'vitest';
import { getStatusLabel, filterByQuery, FRIENDTABS } from '../format_friends';
import type { FriendItem } from '$lib/types/friends';

const mockItems: FriendItem[] = [
	{ friendshipId: 1, id: 1, username: 'alice', name: 'Alice Johnson', avatar_url: null, is_online: true },
	{ friendshipId: 2, id: 2, username: 'bob', name: 'Bob Smith', avatar_url: null, is_online: false },
	{ friendshipId: 3, id: 3, username: 'charlie', name: 'Charlie Brown', avatar_url: null, is_online: true },
	{ friendshipId: 4, id: 4, username: 'diana', name: null, avatar_url: null, is_online: false },
];

describe('getStatusLabel', () => {
	it('should return correct labels', () => {
		expect(getStatusLabel('playing')).toBe('In Game');
		expect(getStatusLabel('away')).toBe('Away');
		expect(getStatusLabel('online')).toBe('Online');
		expect(getStatusLabel('offline')).toBe('Offline');
	});
});

describe('filterByQuery', () => {
	it('should return all items for empty query', () => {
		expect(filterByQuery(mockItems, '')).toEqual(mockItems);
		expect(filterByQuery(mockItems, '  ')).toEqual(mockItems);
	});

	it('should filter by username', () => {
		const result = filterByQuery(mockItems, 'alice');
		expect(result).toHaveLength(1);
		expect(result[0].username).toBe('alice');
	});

	it('should filter by display name', () => {
		const result = filterByQuery(mockItems, 'Johnson');
		expect(result).toHaveLength(1);
		expect(result[0].username).toBe('alice');
	});

	it('should be case-insensitive', () => {
		expect(filterByQuery(mockItems, 'ALICE')).toHaveLength(1);
		expect(filterByQuery(mockItems, 'bob')).toHaveLength(1);
	});

	it('should match partial strings', () => {
		const result = filterByQuery(mockItems, 'ch');
		expect(result).toHaveLength(1);
		expect(result[0].username).toBe('charlie');
	});

	it('should handle null name gracefully', () => {
		const result = filterByQuery(mockItems, 'diana');
		expect(result).toHaveLength(1);
		expect(result[0].name).toBeNull();
	});

	it('should return empty for no matches', () => {
		expect(filterByQuery(mockItems, 'zzz')).toHaveLength(0);
	});

	it('should match across both username and name', () => {
		// "b" matches bob (username) and Charlie Brown (name)
		const result = filterByQuery(mockItems, 'brown');
		expect(result).toHaveLength(1);
		expect(result[0].username).toBe('charlie');
	});
});

describe('FRIENDTABS', () => {
	it('should have 5 tabs', () => {
		expect(FRIENDTABS).toHaveLength(5);
	});

	it('should have correct keys', () => {
		const keys = FRIENDTABS.map(t => t.key);
		expect(keys).toContain('find');
		expect(keys).toContain('requests');
		expect(keys).toContain('friends');
		expect(keys).toContain('sent');
		expect(keys).toContain('blocked');
	});
});
