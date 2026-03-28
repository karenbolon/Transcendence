/** Format a date as relative time ("2m ago", "3d ago") or short date */
export function formatDate(date: Date | string): string {
	const d = new Date(date);
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return 'Just now';
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;

	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** Format a date as casual relative time ("2m ago", "Yesterday", "3 days ago") */
export function timeAgo(date: string | Date | null): string {
	if (!date) return '';
	const diff = Date.now() - new Date(date).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days === 1) return 'Yesterday';
	return `${days} days ago`;
}

/** Convert a number to its ordinal form (1st, 2nd, 3rd, etc.) */
export function ordinal(n: number): string {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Format seconds as "Xm Ys" */
export function formatDuration(seconds: number | null): string {
	if (!seconds) return '—';
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

/** Format a date as full date ("January 15, 2025") */
export function formatJoinDate(date: Date | string): string {
	return new Date(date).toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
		day: 'numeric',
	});
};
