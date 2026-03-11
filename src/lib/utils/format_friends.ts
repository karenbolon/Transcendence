import type { ActivityStatus, FriendItem } from "$lib/types/friends";

export const FRIENDTABS = [
	{ key: 'friends', labelKey: 'friends.all.title', emoji: '👥' },
	{ key: 'find', labelKey: 'friends.find.title', emoji: '🔍' },
	{ key: 'requests', labelKey: 'friends.tabs.requests', emoji: '📩' },
	{ key: 'sent', labelKey: 'friends.tabs.sent', emoji: '📤' },
	{ key: 'blocked', labelKey: 'friends.tabs.blocked', emoji: '🚫' },
] as const;

export function getStatusLabel(status: ActivityStatus): string {
	switch (status) {
		case 'playing': return 'friends.activity.playing';
		case 'away': return 'friends.activity.away';
		case 'online': return 'friends.activity.online';
		default: return 'friends.activity.offline';
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