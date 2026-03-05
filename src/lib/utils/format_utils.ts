import type { Progression } from '$lib/types/progression';

export function mapProgressionRow(row: {
	current_level: number;
	current_xp: number;
	xp_to_next_level: number;
}): Progression {
	return {
			level: row.current_level,
			currentXp: row.current_xp,
			xpToNextLevel: row.xp_to_next_level,
	};
}

export function getDisplayName(user: { displayName?: string | null; username: string }): string {
	return user.displayName || user.username;
}