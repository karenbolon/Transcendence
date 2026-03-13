/** Format game mode code for display */
export function formatMode(mode: string): string {
	switch (mode) {
		case 'local': return 'Local PvP';
		case 'computer': return 'vs Computer';
		case 'online': return 'Online';
		default: return mode;
	}
};

export function formatInvite(invite: string): string {
	switch (invite) {
		case '1v1': return 'Online';
		case 'tournament': return 'Tournament';
		default: return invite;
	}
}

/** Speed preset to emoji */
export function speedEmoji(preset: string): string {
	switch (preset) {
		case 'chill': return '🐢';
		case 'normal': return '🏓';
		case 'fast': return '🔥';
		default: return '';
	}
};

/** Format tournament time */
export function formatTournamentTime(date: Date | string | null): string {
	if (!date) return 'TBD';
	const d = new Date(date);
	const now = new Date();
	const diffMs = d.getTime() - now.getTime();
	const diffHours = Math.floor(diffMs / 3600000);

	if (diffHours < 0) return 'Started';
	if (diffHours < 1) return `Starts in ${Math.floor(diffMs / 60000)}m`;
	if (diffHours < 24) return `Starts in ${diffHours}h`;

	return d.toLocaleDateString('en-US', {
		weekday: 'short',
		hour: 'numeric',
		minute: '2-digit',
	});
};

/** Format tournament for display */
export function formatTournamentFormat(format: string): string {
	switch (format) {
		case 'single_elimination': return 'Single elimination';
		case 'double_elimination': return 'Double elimination';
		case 'round_robin': return 'Round robin';
		default: return format;
	}
};

export function calcWinRate(wins: number, total: number): number {
	return total > 0 ? Math.round((wins / total) * 100) : 0;
};

/** Game mode to emoji */
export function modeEmoji(mode: string): string {
	switch (mode) {
		case 'local': return '👥 Local';
		case 'online': return '🌐 Online';
		case 'computer': return '🤖 Computer';
		default: return '';
	}
}

export function speedLabel(preset: string): string {
	switch (preset) {
		case 'slow': return 'Slow';
		case 'normal': return 'Normal';
		case 'fast': return 'Fast';
		default: return preset;
	}
}


export function winSets(wins: number, total: number): number {
	switch (wins) {
		case 3: return 3;
		case 5: return 5;
		case 7: return 7;
		case 11: return 11;
		default: return 0;
	}
}