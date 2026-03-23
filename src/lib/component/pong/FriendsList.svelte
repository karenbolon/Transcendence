<script lang="ts">
	import type { SpeedPreset } from '$lib/component/pong/gameEngine';
	import UserAvatar from '$lib/component/UserAvatar.svelte';

	type FriendInfo = {
		id: number;
		username: string;
		displayName: string | null;
		avatarUrl: string | null;
		isOnline: boolean;
		inQueue: boolean;
		queueSettings?: { speedPreset: string; winScore: number };
	};

	type Props = {
		friends?: FriendInfo[];
		searching?: boolean;
		onAcceptMatch: (playerId: number) => void;
		onChallenge: (friend: FriendInfo, settings: { speedPreset: SpeedPreset; winScore: number }) => void;
		getActiveSettings: () => { speedPreset: SpeedPreset; winScore: number };
	};

	let {
		friends = [],
		searching = false,
		onAcceptMatch,
		onChallenge,
		getActiveSettings,
	}: Props = $props();

	let friendsInQueue = $derived(friends.filter(f => f.inQueue));
	let friendsOnline = $derived(friends.filter(f => f.isOnline && !f.inQueue));

	function speedEmoji(preset: string): string {
		switch (preset) {
			case 'chill': return '🐢';
			case 'normal': return '🏓';
			case 'fast': return '🔥';
			default: return '🏓';
		}
	}

	function capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}
</script>

<div class="list-panel">
	<h2 class="list-title">Friends</h2>

	{#if friendsInQueue.length === 0 && friendsOnline.length === 0}
		<div class="empty">No friends online</div>
	{:else}
		<div class="scroll-list">
			{#each friendsInQueue as friend}
				<div class="player-row">
					<UserAvatar
						username={friend.username}
						displayName={friend.displayName}
						avatarUrl={friend.avatarUrl}
						size="xs"
						status="online"
					/>
					<div class="player-info">
						<span class="player-name">{friend.displayName ?? friend.username}</span>
						<span class="player-detail">
							{#if friend.queueSettings}
								{speedEmoji(friend.queueSettings.speedPreset)} {capitalize(friend.queueSettings.speedPreset)} · First to {friend.queueSettings.winScore}
							{/if}
						</span>
					</div>
					<button class="btn-accept" disabled={searching} onclick={() => onAcceptMatch(friend.id)}>
						Join
					</button>
				</div>
			{/each}

			{#each friendsOnline as friend}
				<div class="player-row dimmed">
					<UserAvatar
						username={friend.username}
						displayName={friend.displayName}
						avatarUrl={friend.avatarUrl}
						size="xs"
						status="online"
					/>
					<div class="player-info">
						<span class="player-name">{friend.displayName ?? friend.username}</span>
						<span class="player-detail">Online</span>
					</div>
					<button class="btn-challenge" disabled={searching} onclick={() => onChallenge(friend, getActiveSettings())}>
						⚔️ Challenge
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.list-panel {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 0;
	}

	.list-title {
		font-size: 0.8rem;
		font-weight: 700;
		color: #f3f4f6;
		margin: 0;
		padding: 0 0.25rem;
	}

	.scroll-list {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		max-height: 320px;
		overflow-y: auto;
		padding-right: 0.25rem;
	}

	.scroll-list::-webkit-scrollbar {
		width: 4px;
	}

	.scroll-list::-webkit-scrollbar-track {
		background: transparent;
	}

	.scroll-list::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.08);
		border-radius: 2px;
	}

	.player-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.45rem 0.6rem;
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
		transition: all 0.15s;
	}

	.player-row:hover {
		border-color: rgba(255, 255, 255, 0.08);
	}

	.player-row.dimmed {
		opacity: 0.7;
	}

	.player-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
	}

	.player-name {
		font-size: 0.75rem;
		font-weight: 600;
		color: #f3f4f6;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.player-detail {
		font-size: 0.65rem;
		color: #6b7280;
	}

	.empty {
		font-size: 0.75rem;
		color: #4b5563;
		text-align: center;
		padding: 1.5rem 0;
	}

	.btn-accept {
		padding: 0.25rem 0.6rem;
		border-radius: 0.35rem;
		background: #4ade80;
		color: #052e16;
		border: none;
		font-size: 0.7rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.btn-accept:hover {
		background: #86efac;
	}

	.btn-accept:disabled, .btn-challenge:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-challenge {
		padding: 0.25rem 0.6rem;
		border-radius: 0.35rem;
		background: #ff6b9d;;
		color: #ffffff;
		border: 1px solid rgba(255, 255, 255, 0.06);
		font-size: 0.7rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.btn-challenge:hover {
		background: #ff85b1;
		transform: scale(1.01);
	}
</style>
