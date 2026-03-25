import { getSocket } from '$lib/stores/socket.svelte';

// ── Types ──────────────────────────────────────────────
export type ChatMessage = {
	id: number;
	senderId: number;
	senderUsername: string;
	senderAvatar: string | null;
	recipientId: number;
	content: string;
	createdAt: string;
	gameId: number | null;
	type?: string; // 'chat' | 'system'
};

// ── State ──────────────────────────────────────────────
// Using plain objects instead of Maps for Svelte 5 reactivity.
// Map.set() doesn't trigger reactive updates — reassignment does.
let chatOpen = $state(false);
let activeFriendId = $state<number | null>(null);
let conversations = $state<Record<number, ChatMessage[]>>({});
let unreadCounts = $state<Record<number, number>>({});
let typingUsers = $state<Record<number, ReturnType<typeof setTimeout>>>({});
let loadingHistory = $state(false);
let hasMoreMessages = $state<Record<number, boolean>>({});

// ── Getters ────────────────────────────────────────────
export function isChatOpen(): boolean { return chatOpen; }
export function getActiveFriendId(): number | null { return activeFriendId; }
export function getMessages(friendId: number): ChatMessage[] {
	return conversations[friendId] ?? [];
}
export function getUnreadCount(friendId: number): number {
	return unreadCounts[friendId] ?? 0;
}
export function getTotalUnread(): number {
	let total = 0;
	for (const count of Object.values(unreadCounts)) total += count;
	return total;
}
export function isTyping(friendId: number): boolean {
	return friendId in typingUsers;
}
export function isLoadingHistory(): boolean { return loadingHistory; }
export function hasMore(friendId: number): boolean {
	return hasMoreMessages[friendId] ?? true;
}

// ── Actions ────────────────────────────────────────────

/** Open the chat panel */
export function openChat(friendId?: number) {
	chatOpen = true;
	if (friendId) selectFriend(friendId);
}

/** Close the chat panel */
export function closeChat() {
	chatOpen = false;
}

/** Toggle chat panel */
export function toggleChat() {
	chatOpen = !chatOpen;
}

/** Select a friend to chat with — loads history + marks as read */
export async function selectFriend(friendId: number) {
	activeFriendId = friendId;

	// Load history if we don't have it yet
	if (!conversations[friendId]) {
		await loadHistory(friendId);
	}

	// Mark messages as read
	markAsRead(friendId);
}

/** Load chat history from API */
export async function loadHistory(friendId: number, before?: number) {
	loadingHistory = true;
	try {
		const url = before
			? `/api/chat/${friendId}?before=${before}`
			: `/api/chat/${friendId}`;
		const res = await fetch(url);
		if (!res.ok) return;
		const data = await res.json();

		const existing = conversations[friendId] ?? [];
		if (before) {
			conversations = { ...conversations, [friendId]: [...data.messages, ...existing] };
		} else {
			conversations = { ...conversations, [friendId]: data.messages };
		}
		hasMoreMessages = { ...hasMoreMessages, [friendId]: data.hasMore ?? false };
	} finally {
		loadingHistory = false;
	}
}

/** Load older messages (called when scrolling up) */
export async function loadOlderMessages(friendId: number) {
	const msgs = conversations[friendId];
	if (!msgs || msgs.length === 0 || !hasMore(friendId)) return;
	await loadHistory(friendId, msgs[0].id);
}

/** Send a message */
export function sendMessage(recipientId: number, content: string, gameId?: number) {
	const socket = getSocket();
	if (!socket?.connected) return;
	if (!content.trim()) return;
	socket.emit('chat:send', { recipientId, content: content.trim(), gameId });
}

/** Receive a message (called from layout listener) */
export function receiveMessage(msg: ChatMessage) {
	const friendId = msg.senderId;
	const existing = conversations[friendId] ?? [];
	conversations = { ...conversations, [friendId]: [...existing, msg] };

	// If chat is NOT open to this friend, increment unread
	if (!chatOpen || activeFriendId !== friendId) {
		unreadCounts = { ...unreadCounts, [friendId]: (unreadCounts[friendId] ?? 0) + 1 };
	} else {
		// Chat is open to this friend — mark as read immediately
		markAsRead(friendId);
	}
}

/** Handle sent confirmation (add to our own conversation) */
export function onMessageSent(msg: ChatMessage) {
	const friendId = msg.recipientId;
	const existing = conversations[friendId] ?? [];
	// Avoid duplicates (check by id)
	if (!existing.some(m => m.id === msg.id)) {
		conversations = { ...conversations, [friendId]: [...existing, msg] };
	}
}

/** Mark all messages from a friend as read */
export function markAsRead(friendId: number) {
	if ((unreadCounts[friendId] ?? 0) === 0) return;
	unreadCounts = { ...unreadCounts, [friendId]: 0 };

	const socket = getSocket();
	if (socket?.connected) {
		socket.emit('chat:read', { friendId });
	}
}

/** Set typing indicator for a user (auto-clears after 3s) */
export function setTyping(userId: number) {
	// Clear existing timer
	const existing = typingUsers[userId];
	if (existing) clearTimeout(existing);

	// Set new timer — auto-clear after 3 seconds
	const timer = setTimeout(() => {
		const { [userId]: _, ...rest } = typingUsers;
		typingUsers = rest;
	}, 3000);
	typingUsers = { ...typingUsers, [userId]: timer };
}

/** Clear typing indicator */
export function clearTyping(userId: number) {
	const timer = typingUsers[userId];
	if (timer) clearTimeout(timer);
	const { [userId]: _, ...rest } = typingUsers;
	typingUsers = rest;
}

/** Send typing indicator to recipient */
export function emitTyping(recipientId: number) {
	const socket = getSocket();
	if (socket?.connected) {
		socket.emit('chat:typing', { recipientId });
	}
}

/** Send stop typing to recipient */
export function emitStopTyping(recipientId: number) {
	const socket = getSocket();
	if (socket?.connected) {
		socket.emit('chat:stop-typing', { recipientId });
	}
}

/** Load initial unread counts on app load */
export async function loadUnreadCounts() {
	try {
		const res = await fetch('/api/chat/unread');
		if (!res.ok) return;
		const data = await res.json();
		const counts: Record<number, number> = {};
		for (const [senderId, count] of Object.entries(data.counts)) {
			counts[Number(senderId)] = count as number;
		}
		unreadCounts = counts;
	} catch {
		// silently fail
	}
}

/** Reset all chat state (on logout) */
export function resetChat() {
	chatOpen = false;
	activeFriendId = null;
	conversations = {};
	unreadCounts = {};
	typingUsers = {};
	hasMoreMessages = {};
}
