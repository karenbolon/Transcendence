// Temporary state that lives between "challenge sent" and "game starts".
// Set before navigating to /play/online/waiting, cleared on cancel or game start.

type WaitingData = {
	you: { username: string; avatarUrl: string | null; displayName: string | null };
	opponent: { username: string; avatarUrl: string | null; displayName: string | null };
	settings: { speedPreset: 'chill' | 'normal' | 'fast' | 'random'; winScore: number; mode: string };
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

// Store game:start data so the room page can access player info (avatars, names)
type GameStartData = {
	roomId: string;
	player1: { userId: number; username: string; avatarUrl?: string | null; displayName?: string | null };
	player2: { userId: number; username: string; avatarUrl?: string | null; displayName?: string | null };
	settings: any;
};

let gameStartData = $state<GameStartData | null>(null);

export function setGameStart(data: GameStartData) {
	gameStartData = data;
}

export function getGameStart(): GameStartData | null {
	return gameStartData;
}

export function clearGameStart() {
	gameStartData = null;
}

// Store what settings the user originally queued with — so the room page
// can show a banner if match settings differ from what was expected.
type QueuedSettings = { mode: string; speedPreset: string; winScore: number } | null;

let queuedSettings = $state<QueuedSettings>(null);

export function setQueuedSettings(data: QueuedSettings) {
	queuedSettings = data;
}

export function getQueuedSettings(): QueuedSettings {
	return queuedSettings;
}

export function clearQueuedSettings() {
	queuedSettings = null;
}
