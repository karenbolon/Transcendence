type TournamentRole = 'participant' | 'spectator' | 'eliminated' | 'champion' | 'runner-up' | null;
type TournamentStatus = 'scheduled' | 'in_progress' | 'finished' | 'cancelled' | null;

type TournamentTrackingState = {
	tournamentId: number | null;
	returnPath: string | null;
	activeMatchRoomId: string | null;
	role: TournamentRole;
	status: TournamentStatus;
};

let tracking = $state<TournamentTrackingState>({
	tournamentId: null,
	returnPath: null,
	activeMatchRoomId: null,
	role: null,
	status: null,
});

function extractTournamentId(pathname: string): number | null {
	const detailMatch = pathname.match(/^\/tournaments\/(\d+)$/);
	if (detailMatch) return Number(detailMatch[1]);

	const roomMatch = pathname.match(/^\/play\/online\/tournament-(\d+)-r\d+-m\d+$/);
	if (roomMatch) return Number(roomMatch[1]);

	return null;
}

function getRoleFromParticipantStatus(status?: string | null, isParticipant?: boolean): TournamentRole {
	if (status === 'champion') return 'champion';
	if (status === 'eliminated') return 'eliminated';
	if (isParticipant) return 'participant';
	return null;
}

export function syncTournamentContext(pathname: string) {
	const tournamentId = extractTournamentId(pathname);
	if (tournamentId === null) return;

	tracking = {
		...tracking,
		tournamentId,
		returnPath: `/tournaments/${tournamentId}`,
		activeMatchRoomId: pathname.startsWith('/play/online/') ? pathname.slice('/play/online/'.length) : tracking.activeMatchRoomId,
	};
}

export function syncTournamentFromPage(params: {
	tournamentId: number;
	status?: string | null;
	isParticipant?: boolean;
	myParticipantStatus?: string | null;
}) {
	tracking = {
		...tracking,
		tournamentId: params.tournamentId,
		returnPath: `/tournaments/${params.tournamentId}`,
		status: (params.status as TournamentStatus | undefined) ?? tracking.status,
		role: getRoleFromParticipantStatus(params.myParticipantStatus, params.isParticipant),
	};
}

export function markTournamentStarted(tournamentId: number) {
	tracking = {
		...tracking,
		tournamentId,
		returnPath: `/tournaments/${tournamentId}`,
		status: 'in_progress',
		role: tracking.role ?? 'participant',
	};
}

export function markTournamentJoined(tournamentId: number) {
	tracking = {
		...tracking,
		tournamentId,
		returnPath: `/tournaments/${tournamentId}`,
		role: 'participant',
		status: tracking.status ?? 'scheduled',
	};
}

export function markTournamentLeft(tournamentId: number) {
	if (tracking.tournamentId !== tournamentId) return;
	tracking = {
		...tracking,
		role: null,
		activeMatchRoomId: null,
	};
}

export function markTournamentMatch(roomId: string, tournamentId: number) {
	tracking = {
		...tracking,
		tournamentId,
		returnPath: `/tournaments/${tournamentId}`,
		activeMatchRoomId: roomId,
		status: 'in_progress',
		role: tracking.role ?? 'participant',
	};
}

export function markTournamentAdvanced(tournamentId: number) {
	tracking = {
		...tracking,
		tournamentId,
		returnPath: `/tournaments/${tournamentId}`,
		status: 'in_progress',
		role: 'participant',
		activeMatchRoomId: null,
	};
}

export function markTournamentEliminated(tournamentId: number) {
	tracking = {
		...tracking,
		tournamentId,
		returnPath: `/tournaments/${tournamentId}`,
		status: 'in_progress',
		role: 'eliminated',
		activeMatchRoomId: null,
	};
}

export function markTournamentFinished(tournamentId: number, role?: Exclude<TournamentRole, 'participant' | 'spectator' | null>) {
	tracking = {
		...tracking,
		tournamentId,
		returnPath: `/tournaments/${tournamentId}`,
		status: 'finished',
		role: role ?? tracking.role ?? 'spectator',
		activeMatchRoomId: null,
	};
}

export function markTournamentCancelled(tournamentId: number) {
	if (tracking.tournamentId !== tournamentId) return;
	tracking = {
		tournamentId: null,
		returnPath: null,
		activeMatchRoomId: null,
		role: null,
		status: 'cancelled',
	};
}

export function clearActiveTournamentMatch(roomId?: string | null) {
	if (!roomId || tracking.activeMatchRoomId === roomId) {
		tracking = { ...tracking, activeMatchRoomId: null };
	}
}

export function clearTournamentContext() {
	tracking = {
		tournamentId: null,
		returnPath: null,
		activeMatchRoomId: null,
		role: null,
		status: null,
	};
}

export function getTrackedTournamentId(): number | null {
	return tracking.tournamentId;
}

export function getTrackedTournamentPath(fallbackTournamentId?: number | null): string {
	if (tracking.returnPath) return tracking.returnPath;
	if (fallbackTournamentId) return `/tournaments/${fallbackTournamentId}`;
	return '/tournaments';
}

export function getTrackedTournamentState(): TournamentTrackingState {
	return tracking;
}
