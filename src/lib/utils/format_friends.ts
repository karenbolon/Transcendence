import type { ActivityStatus, FriendItem } from "$lib/types/friends";
import { _ } from 'svelte-i18n';

export const FRIENDTABS = [
	{ key: 'friends', labelKey: 'friends.allFriends', emoji: '👥' },
	{ key: 'find', labelKey: 'friends.findFriends', emoji: '🔍' },
	{ key: 'requests', labelKey: 'friends.requests', emoji: '📩' },
	{ key: 'sent', labelKey: 'friends.status.sent', emoji: '📤' },
	{ key: 'blocked', labelKey: 'friends.status.blocked', emoji: '🚫' },
] as const;

export function getStatusLabel(status: ActivityStatus): string {
	switch (status) {
		case 'playing': return 'friends.status.inGame';
		case 'away': return 'friends.status.away';
		case 'online': return 'friends.status.online';
		default: return 'friends.status.offline';
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