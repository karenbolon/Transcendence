<script lang="ts">
	import UserAvatar from '$lib/component/UserAvatar.svelte';

	let {
		participants,
		maxPlayers,
		isCreator,
		isParticipant,
		tournamentId,
		onJoin,
		onLeave,
		onStart,
	}: {
		participants: Array<{
			userId: number;
			username: string;
			name: string | null;
			avatarUrl: string | null;
			seed: number | null;
			status: string;
		}>;
		maxPlayers: number;
		isCreator: boolean;
		isParticipant: boolean;
		tournamentId: number;
		onJoin: () => void;
		onLeave: () => void;
		onStart: () => void;
	} = $props();

	let canStart = $derived(isCreator && participants.length >= 2);
</script>

<div class="lobby">
	<div class="lobby-header">
		<h2 class="lobby-title">Lobby</h2>
		<span class="player-count">{participants.length} / {maxPlayers} players</span>
	</div>

	<div class="player-list">
		{#each participants as p}
			<div class="player-row">
				<UserAvatar avatarUrl={p.avatarUrl} username={p.username} size="sm" />
				<div class="player-info">
					<span class="player-name">{p.name ?? p.username}</span>
					<span class="player-username">@{p.username}</span>
				</div>
				{#if p.seed}
					<span class="seed">#{p.seed}</span>
				{/if}
			</div>
		{/each}

		{#if participants.length < maxPlayers}
			{#each Array(maxPlayers - participants.length) as _}
				<div class="player-row empty">
					<div class="empty-avatar"></div>
					<span class="waiting">Waiting for player...</span>
				</div>
			{/each}
		{/if}
	</div>

	<div class="lobby-actions">
		{#if !isParticipant}
			<button class="btn btn-join" onclick={onJoin}>Join Tournament</button>
		{:else if !isCreator}
			<button class="btn btn-leave" onclick={onLeave}>Leave</button>
		{/if}

		{#if canStart}
			<button class="btn btn-start" onclick={onStart}>Start Tournament</button>
		{:else if isCreator && participants.length < 2}
			<button class="btn btn-start" disabled>Need at least 2 players</button>
		{/if}
	</div>
</div>

<style>
	.lobby {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 20px;
	}
	.lobby-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}
	.lobby-title {
		margin: 0;
		font-size: 1.1rem;
	}
	.player-count {
		font-size: 0.85rem;
		color: var(--accent);
		font-weight: 600;
	}
	.player-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 16px;
	}
	.player-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.03);
	}
	.player-row.empty {
		opacity: 0.4;
	}
	.empty-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		border: 1px dashed rgba(255, 255, 255, 0.2);
	}
	.player-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.player-name {
		font-size: 0.9rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.player-username {
		font-size: 0.75rem;
		color: #888;
	}
	.waiting {
		font-size: 0.8rem;
		color: #666;
		font-style: italic;
	}
	.seed {
		margin-left: auto;
		font-size: 0.75rem;
		color: #888;
		font-weight: 600;
	}
	.lobby-actions {
		display: flex;
		gap: 10px;
	}
	.btn {
		padding: 8px 20px;
		border-radius: 8px;
		border: none;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.btn-join {
		background: var(--accent);
		color: #fff;
	}
	.btn-join:hover:not(:disabled) {
		background: var(--accent-hover);
	}
	.btn-leave {
		background: rgba(255, 255, 255, 0.1);
		color: #ccc;
	}
	.btn-leave:hover {
		background: rgba(255, 255, 255, 0.15);
	}
	.btn-start {
		background: #4ade80;
		color: #000;
	}
	.btn-start:hover:not(:disabled) {
		background: #22c55e;
	}
</style>
