// Temporary state that lives between "challenge sent" and "game starts".
// Set before navigating to /play/online/waiting, cleared on cancel or game start.

type WaitingData = {
	you: { username: string; avatarUrl: string | null; displayName: string | null };
	opponent: { username: string; avatarUrl: string | null; displayName: string | null };
	settings: { speedPreset: 'chill' | 'normal' | 'fast'; winScore: number; mode: string };
	totalTime: number; // seconds (e.g. 30 for friend invite)
};

let waitingData = $state<WaitingData | null>(null);

export function setWaiting(data: WaitingData) {
	waitingData = data;
}

export function getWaiting(): WaitingData | null {
	return waitingData;
}

export function clearWaiting() {
	waitingData = null;
}
