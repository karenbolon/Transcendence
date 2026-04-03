import { getSocket } from '$lib/stores/socket.svelte';

export type TournamentChatMessage = {
	id: number;
	tournamentId: number;
	userId: number;
	username: string;
	avatarUrl: string | null;
	content: string;
	type: string; // 'chat' | 'system'
	createdAt: string;
};

// State keyed by tournamentId
let messagesByTournament = $state<Record<number, TournamentChatMessage[]>>({});
let loadingHistory = $state(false);
let hasMore = $state<Record<number, boolean>>({});

// ── Getters ────────────────────────────────────────
export function getMessages(tournamentId: number): TournamentChatMessage[] {
	return messagesByTournament[tournamentId] ?? [];
}

export function isLoading(): boolean {
	return loadingHistory;
}

export function hasMoreMessages(tournamentId: number): boolean {
	return hasMore[tournamentId] ?? true;
}

// ── Actions ────────────────────────────────────────
export function receiveMessage(msg: TournamentChatMessage) {
	const tid = msg.tournamentId;
	const existing = messagesByTournament[tid] ?? [];
	// Avoid duplicates
	if (existing.some(m => m.id === msg.id)) return;
	messagesByTournament = { ...messagesByTournament, [tid]: [...existing, msg] };
}

export function sendMessage(tournamentId: number, content: string) {
	const socket = getSocket();
	if (!socket?.connected) return;
	if (!content.trim()) return;
	socket.emit('tournament:chat-send', { tournamentId, content: content.trim() });
}

export async function loadHistory(tournamentId: number) {
	loadingHistory = true;
	try {
		const socket = getSocket();
		if (!socket?.connected) return;

		const result = await new Promise<{ messages: TournamentChatMessage[]; hasMore: boolean }>((resolve) => {
			socket.emit('tournament:chat-history', { tournamentId }, (data: any) => {
				resolve(data);
			});
			// Fallback: listen for the event if callback not supported
			socket.once('tournament:chat-history', (data: any) => {
				resolve(data);
			});
		});

		messagesByTournament = {
			...messagesByTournament,
			[tournamentId]: result.messages,
		};
		hasMore = { ...hasMore, [tournamentId]: result.hasMore };
	} finally {
		loadingHistory = false;
	}
}

export function clearMessages(tournamentId: number) {
	const { [tournamentId]: _, ...rest } = messagesByTournament;
	messagesByTournament = rest;
}