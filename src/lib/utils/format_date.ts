import { _ } from 'svelte-i18n';
import { get } from 'svelte/store';

/** Format a date as relative time ("2m ago", "3d ago") or short date */
export function formatDate(date: Date | string): string {
	const d = new Date(date);
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	// Get the current translate function
	const translate = get(_);

	if (diffMins < 1) return translate('time.just_now');
	if (diffMins < 60) return translate('time.minutes_ago', { values: { minutes: diffMins } });
	if (diffHours < 24) return translate('time.hours_ago', { values: { hours: diffHours } });
	if (diffDays < 7) return translate('time.days_ago', { values: { days: diffDays } });

	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

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
