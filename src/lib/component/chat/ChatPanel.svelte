<script lang="ts">
	import {
		isChatOpen, closeChat, getActiveFriendId, selectFriend,
		getMessages, getUnreadCount, getTotalUnread, isTyping,
		sendMessage, emitTyping, emitStopTyping,
		isLoadingHistory, loadOlderMessages, hasMore,
	} from '$lib/stores/chat.svelte';
	import { getSocket } from '$lib/stores/socket.svelte';
	import UserAvatar from '$lib/component/UserAvatar.svelte';
	import ChallengePicker from '$lib/component/ChallengePicker.svelte';
	import { setWaiting } from '$lib/stores/matchmaking.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	type Props = {
		user: { id: string; username: string; name: string; avatar_url: string | null };
	};

	let { user }: Props = $props();

	// Friend list from page data (same data the friends page uses)
	// We get this from the layout's data.friends if available,
	// or fetch it on demand
	let friends = $state<Array<{
		id: number; username: string; name: string | null;
		avatar_url: string | null; is_online: boolean;
	}>>([]);

	let inputText = $state('');
	let messagesContainer: HTMLDivElement | undefined = $state();
	let typingTimer: ReturnType<typeof setTimeout> | null = null;

	// Load friends list
	async function loadFriends() {
		try {
			// Use the existing friends page server data if on friends page,
			// otherwise fetch from a lightweight API
			const res = await fetch('/api/chat/friends');
			if (res.ok) {
				const data = await res.json();
				friends = data.friends;
			}
		} catch { /* ignore */ }
	}

	// Load friends when panel opens
	$effect(() => {
		if (isChatOpen()) {
			loadFriends();
		}
	});

	// Auto-scroll to bottom when new messages arrive
	$effect(() => {
		const friendId = getActiveFriendId();
		if (friendId) {
			const msgs = getMessages(friendId);
			if (msgs.length > 0 && messagesContainer) {
				// Use tick to wait for DOM update
				requestAnimationFrame(() => {
					if (messagesContainer) {
						messagesContainer.scrollTop = messagesContainer.scrollHeight;
					}
				});
			}
		}
	});

	function handleSend() {
		const friendId = getActiveFriendId();
		if (!friendId || !inputText.trim()) return;
		sendMessage(friendId, inputText);
		inputText = '';
		// Stop typing indicator
		if (typingTimer) clearTimeout(typingTimer);
		emitStopTyping(friendId);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
			return;
		}
		// Send typing indicator (debounced)
		const friendId = getActiveFriendId();
		if (!friendId) return;
		emitTyping(friendId);
		if (typingTimer) clearTimeout(typingTimer);
		typingTimer = setTimeout(() => {
			emitStopTyping(friendId);
		}, 2000);
	}

	function handleScroll() {
		const friendId = getActiveFriendId();
		if (!friendId || !messagesContainer) return;
		// Load older messages when scrolled to top
		if (messagesContainer.scrollTop < 50 && hasMore(friendId) && !isLoadingHistory()) {
			loadOlderMessages(friendId);
		}
	}

	// Game invite from chat — open ChallengePicker first
	let challengeTarget = $state<{ id: number; username: string; name: string | null; avatar_url: string | null } | null>(null);

	function inviteToPlay(friendId: number) {
		const friend = friends.find(f => f.id === friendId);
		if (!friend) return;
		challengeTarget = { id: friend.id, username: friend.username, name: friend.name, avatar_url: friend.avatar_url };
	}

	function sendChallenge(settings: { speedPreset: string; winScore: number }) {
		if (!challengeTarget) return;
		const socket = getSocket();
		if (!socket?.connected) return;
		socket.emit('game:invite', { friendId: challengeTarget.id, settings });

		setWaiting({
			you: { username: user.username, avatarUrl: user.avatar_url, displayName: user.name },
			opponent: { username: challengeTarget.username, avatarUrl: challengeTarget.avatar_url, displayName: challengeTarget.name },
			settings: { speedPreset: settings.speedPreset as 'chill' | 'normal' | 'fast', winScore: settings.winScore, mode: 'online' },
			totalTime: 30,
		});
		challengeTarget = null;
		closeChat();
		goto('/play/online/waiting');
	}

	// Navigate to friend's profile
	function viewProfile(friendId: number) {
		closeChat();
		window.location.href = `/friends/${friendId}`;
	}

	function formatTime(dateStr: string | Date | null | undefined): string {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return '';
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

{#if isChatOpen()}
	<!-- Backdrop -->
	<button class="chat-backdrop" onclick={closeChat} aria-label="Close chat"></button>

	<div class="chat-panel">
		<!-- Header -->
		<div class="chat-header">
			<h3>Messages</h3>
			<button class="close-btn" onclick={closeChat}>✕</button>
		</div>

		<div class="chat-body">
			<!-- Friend List (left side) -->
			<div class="chat-friends">
				{#each friends as friend}
					{@const unread = getUnreadCount(friend.id)}
					<button
						class="friend-row"
						class:active={getActiveFriendId() === friend.id}
						onclick={() => selectFriend(friend.id)}
					>
						<UserAvatar
							username={friend.username}
							displayName={friend.name}
							avatarUrl={friend.avatar_url}
							size="md"
							status={friend.is_online ? 'online' : 'offline'}
						/>
						<div class="friend-info">
							<span class="friend-name">{friend.name || friend.username}</span>
							{#if isTyping(friend.id)}
								<span class="typing-indicator">typing...</span>
							{:else}
								{@const lastMsg = getMessages(friend.id).at(-1)}
								{#if lastMsg}
									<span class="last-message">{lastMsg.type === 'system' ? lastMsg.content : lastMsg.content.slice(0, 30)}{lastMsg.content.length > 30 ? '...' : ''}</span>
								{/if}
							{/if}
						</div>
						{#if unread > 0}
							<span class="unread-badge">{unread}</span>
						{/if}
					</button>
				{/each}
				{#if friends.length === 0}
					<p class="empty-text">No friends yet</p>
				{/if}
			</div>

			<!-- Message Thread (right side) -->
			<div class="chat-thread">
				{#if getActiveFriendId()}
					{@const friendId = getActiveFriendId()!}
					{@const msgs = getMessages(friendId)}
					{@const activeFriend = friends.find(f => f.id === friendId)}

					<!-- Thread header with profile + invite buttons -->
					<div class="thread-header">
						<span class="thread-name">{activeFriend?.name || activeFriend?.username}</span>
						<div class="thread-actions">
							<button
								class="action-btn"
								onclick={() => inviteToPlay(friendId)}
								title="Invite to play"
							>🎮</button>
							<button
								class="action-btn"
								onclick={() => viewProfile(friendId)}
								title="View profile"
							>👤</button>
						</div>
					</div>

					<!-- Messages -->
					<div
						class="messages-scroll"
						bind:this={messagesContainer}
						onscroll={handleScroll}
					>
						{#if isLoadingHistory()}
							<div class="loading-older">Loading...</div>
						{/if}
						{#each msgs as msg}
							{#if msg.type === 'system'}
								<div class="system-message">
									<span>{msg.content}</span>
								</div>
							{:else}
								<div
									class="message-bubble"
									class:mine={msg.senderId === Number(user.id)}
									class:theirs={msg.senderId !== Number(user.id)}
								>
									<p class="msg-content">{msg.content}</p>
									<span class="msg-time">{formatTime(msg.createdAt)}</span>
								</div>
							{/if}
						{/each}
						{#if isTyping(friendId)}
							<div class="typing-bubble">
								<span class="typing-dots">
									<span></span><span></span><span></span>
								</span>
							</div>
						{/if}
					</div>

					<!-- Input -->
					<div class="chat-input-bar">
						<input
							type="text"
							bind:value={inputText}
							onkeydown={handleKeydown}
							placeholder="Type a message..."
							maxlength="500"
						/>
						<button
							class="send-btn"
							onclick={handleSend}
							disabled={!inputText.trim()}
						>Send</button>
					</div>
				{:else}
					<div class="no-conversation">
						<p>Select a friend to start chatting</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

{#if challengeTarget}
	<ChallengePicker
		targetName={{ username: challengeTarget.username, displayName: challengeTarget.name, avatarUrl: challengeTarget.avatar_url }}
		onSend={sendChallenge}
		onCancel={() => challengeTarget = null}
	/>
{/if}

<style>
	.chat-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		z-index: 90;
		border: none;
		cursor: default;
	}

	.chat-panel {
		position: fixed;
		right: 0;
		top: 0;
		bottom: 0;
		width: min(700px, 90vw);
		background: #0f0f23;
		border-left: 1px solid rgba(255, 255, 255, 0.08);
		z-index: 100;
		display: flex;
		flex-direction: column;
		animation: slideIn 0.2s ease;
	}

	@keyframes slideIn {
		from { transform: translateX(100%); }
		to { transform: translateX(0); }
	}

	.chat-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.chat-header h3 {
		font-size: 1rem;
		color: #e5e7eb;
		margin: 0;
	}

	.close-btn {
		background: none;
		border: none;
		color: #6b7280;
		font-size: 1.2rem;
		cursor: pointer;
		padding: 0.25rem;
	}

	.chat-body {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	/* ── Friend List ── */
	.chat-friends {
		width: 220px;
		border-right: 1px solid rgba(255, 255, 255, 0.06);
		overflow-y: auto;
		flex-shrink: 0;
	}

	.friend-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.75rem;
		width: 100%;
		background: none;
		border: none;
		color: #d1d5db;
		cursor: pointer;
		text-align: left;
		transition: background 0.15s;
	}

	.friend-row:hover, .friend-row.active {
		background: rgba(255, 255, 255, 0.05);
	}

	.friend-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.friend-name {
		font-size: 0.8rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.typing-indicator {
		font-size: 0.7rem;
		color: #60a5fa;
		font-style: italic;
	}

	.last-message {
		font-size: 0.68rem;
		color: #4b5563;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.unread-badge {
		background: #ff6b9d;
		color: white;
		font-size: 0.65rem;
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
		font-weight: 700;
		flex-shrink: 0;
	}

	.empty-text {
		padding: 1rem;
		color: #4b5563;
		font-size: 0.8rem;
		text-align: center;
	}

	/* ── Thread ── */
	.chat-thread {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.thread-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.6rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.thread-name {
		font-size: 0.85rem;
		color: #e5e7eb;
		font-weight: 500;
	}

	.thread-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		background: none;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.4rem;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.15s;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.messages-scroll {
		flex: 1;
		overflow-y: auto;
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.loading-older {
		text-align: center;
		color: #6b7280;
		font-size: 0.75rem;
		padding: 0.5rem;
	}

	.message-bubble {
		max-width: 75%;
		padding: 0.5rem 0.75rem;
		border-radius: 0.75rem;
		font-size: 0.85rem;
		line-height: 1.4;
		word-wrap: break-word;
	}

	.message-bubble.mine {
		align-self: flex-end;
		background: rgba(96, 165, 250, 0.15);
		color: #93c5fd;
		border-bottom-right-radius: 0.25rem;
	}

	.message-bubble.theirs {
		align-self: flex-start;
		background: rgba(255, 255, 255, 0.06);
		color: #d1d5db;
		border-bottom-left-radius: 0.25rem;
	}

	.system-message {
		align-self: center;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		font-size: 0.68rem;
		color: #6b7280;
		text-align: center;
	}

	.msg-content {
		margin: 0;
	}

	.msg-time {
		font-size: 0.6rem;
		color: #6b7280;
		display: block;
		margin-top: 0.2rem;
	}

	.mine .msg-time {
		text-align: right;
	}

	.typing-bubble {
		align-self: flex-start;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
	}

	.typing-dots {
		display: flex;
		gap: 3px;
	}

	.typing-dots span {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #6b7280;
		animation: dotPulse 1.2s infinite;
	}

	.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
	.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

	@keyframes dotPulse {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 1; }
	}

	.no-conversation {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #4b5563;
		font-size: 0.85rem;
	}

	/* ── Input ── */
	.chat-input-bar {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.chat-input-bar input {
		flex: 1;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
		color: #e5e7eb;
		font-size: 0.85rem;
		outline: none;
	}

	.chat-input-bar input:focus {
		border-color: rgba(96, 165, 250, 0.4);
	}

	.send-btn {
		padding: 0.5rem 1rem;
		background: rgba(96, 165, 250, 0.2);
		border: 1px solid rgba(96, 165, 250, 0.3);
		border-radius: 0.5rem;
		color: #60a5fa;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.send-btn:hover:not(:disabled) {
		background: rgba(96, 165, 250, 0.3);
	}

	.send-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	/* ── Mobile ── */
	@media (max-width: 600px) {
		.chat-panel {
			width: 100vw;
		}
		.chat-friends {
			width: 180px;
		}
	}
</style>