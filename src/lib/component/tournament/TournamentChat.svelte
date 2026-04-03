<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getSocket } from '$lib/stores/socket.svelte';
	import {
		getMessages,
		sendMessage,
		receiveMessage,
		loadHistory,
		isLoading,
		type TournamentChatMessage,
	} from '$lib/stores/tournament_chat.svelte';
	import UserAvatar from '$lib/component/common/UserAvatar.svelte';

	type Props = {
		tournamentId: number;
		currentUserId: number;
		isParticipant: boolean;
	};

	let { tournamentId, currentUserId, isParticipant }: Props = $props();

	let inputText = $state('');
	let messagesContainer: HTMLDivElement | undefined = $state();
	let collapsed = $state(false);

	let messages = $derived(getMessages(tournamentId));

	// Load history on mount
	onMount(() => {
		loadHistory(tournamentId);

		const socket = getSocket();
		if (!socket) return;

		function handleMessage(msg: TournamentChatMessage) {
			if (msg.tournamentId === tournamentId) {
				receiveMessage(msg);
			}
		}

		socket.on('tournament:chat-message', handleMessage);

		return () => {
			socket.off('tournament:chat-message', handleMessage);
		};
	});

	// Auto-scroll on new messages
	$effect(() => {
		if (messages.length > 0 && messagesContainer) {
			requestAnimationFrame(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			});
		}
	});

	function handleSend() {
		if (!inputText.trim() || !isParticipant) return;
		sendMessage(tournamentId, inputText);
		inputText = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function formatTime(dateStr: string): string {
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return '';
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="tournament-chat" class:collapsed>
	<button class="chat-toggle" onclick={() => (collapsed = !collapsed)}>
		<span class="chat-toggle-icon">{collapsed ? '💬' : '▼'}</span>
		<span>Tournament Chat</span>
		{#if collapsed && messages.length > 0}
			<span class="msg-count">{messages.length}</span>
		{/if}
	</button>

	{#if !collapsed}
		<div class="chat-messages" bind:this={messagesContainer}>
			{#if isLoading()}
				<div class="loading">Loading messages...</div>
			{/if}
			{#each messages as msg}
				{#if msg.type === 'system'}
					<div class="system-msg">
						<span>{msg.content}</span>
					</div>
				{:else}
					<div class="chat-msg" class:mine={msg.userId === currentUserId}>
						<UserAvatar
							username={msg.username}
							avatarUrl={msg.avatarUrl}
							size="xs"
						/>
						<div class="msg-body">
							<span class="msg-author">{msg.username}</span>
							<span class="msg-text">{msg.content}</span>
						</div>
						<span class="msg-time">{formatTime(msg.createdAt)}</span>
					</div>
				{/if}
			{/each}
			{#if messages.length === 0 && !isLoading()}
				<div class="empty-chat">No messages yet</div>
			{/if}
		</div>

		{#if isParticipant}
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
				>
					Send
				</button>
			</div>
		{:else}
			<div class="read-only-bar">
				<span>Only participants can chat</span>
			</div>
		{/if}
	{/if}
</div>

<style>
	.tournament-chat {
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		overflow: hidden;
		margin-top: 1.5rem;
	}

	.chat-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.65rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		color: #d1d5db;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		text-align: left;
	}
	.chat-toggle:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.chat-toggle-icon {
		font-size: 0.8rem;
	}

	.msg-count {
		margin-left: auto;
		background: rgba(255, 107, 157, 0.2);
		color: #ff6b9d;
		font-size: 0.65rem;
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
		font-weight: 700;
	}

	.collapsed .chat-toggle {
		border-bottom: none;
	}

	.chat-messages {
		max-height: 300px;
		overflow-y: auto;
		padding: 0.5rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.loading,
	.empty-chat {
		text-align: center;
		color: #4b5563;
		font-size: 0.75rem;
		padding: 1rem;
	}

	.system-msg {
		align-self: center;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		font-size: 0.65rem;
		color: #6b7280;
		text-align: center;
	}

	.chat-msg {
		display: flex;
		align-items: flex-start;
		gap: 0.4rem;
		padding: 0.25rem 0;
	}

	.msg-body {
		flex: 1;
		min-width: 0;
	}

	.msg-author {
		font-size: 0.7rem;
		font-weight: 600;
		color: #9ca3af;
		margin-right: 0.3rem;
	}

	.chat-msg.mine .msg-author {
		color: #ff6b9d;
	}

	.msg-text {
		font-size: 0.8rem;
		color: #d1d5db;
		word-wrap: break-word;
	}

	.msg-time {
		font-size: 0.55rem;
		color: #4b5563;
		flex-shrink: 0;
		margin-top: 0.15rem;
	}

	.chat-input-bar {
		display: flex;
		gap: 0.4rem;
		padding: 0.5rem 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.chat-input-bar input {
		flex: 1;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.4rem;
		padding: 0.4rem 0.6rem;
		color: #e5e7eb;
		font-size: 0.8rem;
		outline: none;
	}
	.chat-input-bar input:focus {
		border-color: rgba(96, 165, 250, 0.3);
	}

	.send-btn {
		padding: 0.4rem 0.75rem;
		background: rgba(96, 165, 250, 0.2);
		border: 1px solid rgba(96, 165, 250, 0.3);
		border-radius: 0.4rem;
		color: #60a5fa;
		font-size: 0.75rem;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.15s;
	}
	.send-btn:hover:not(:disabled) {
		background: rgba(96, 165, 250, 0.3);
	}
	.send-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.read-only-bar {
		padding: 0.5rem 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		text-align: center;
		font-size: 0.72rem;
		color: #4b5563;
	}
</style>
