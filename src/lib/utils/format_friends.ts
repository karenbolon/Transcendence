import type { ActivityStatus, FriendItem } from "$lib/types/friends";

export const FRIENDTABS = [
	{ key: 'friends', label: 'All Friends', emoji: '👥' },
	{ key: 'find', label: 'Find Friends', emoji: '🔍' },
	{ key: 'requests', label: 'Requests', emoji: '📩' },
	{ key: 'sent', label: 'Sent', emoji: '📤' },
	{ key: 'blocked', label: 'Blocked', emoji: '🚫' },
] as const;

export function getStatusLabel(status: ActivityStatus): string {
	switch (status) {
		case 'playing': return 'In Game';
		case 'away': return 'Away';
		case 'online': return 'Online';
		default: return 'Offline';
	}
}

/** Client-side filter for tab lists by username or display name */
export function filterByQuery(items: FriendItem[], query: string): FriendItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return items;
	return items.filter(item =>
		item.username.toLowerCase().includes(q) ||
		(item.name && item.name.toLowerCase().includes(q))
	);
}