<script lang="ts">
	import UserAvatar from '$lib/component/UserAvatar.svelte';
	import { speedEmoji } from '$lib/utils/format_game';
	import { capitalize } from '$lib/utils/format_progression';

	type QueuePlayer = {
		id: number;
		username: string;
		displayName: string | null;
		avatarUrl: string | null;
		wins: number;
		queueSettings: { speedPreset: string; winScore: number };
	};

	type Props = {
		queuePlayers?: QueuePlayer[];
		searching?: boolean;
		onAcceptMatch: (playerId: number) => void;
	};

	let {
		queuePlayers = [],
		searching = false,
		onAcceptMatch,
	}: Props = $props();

</script>

<div class="list-panel">
	<h2 class="list-title">Open Queue</h2>

	{#if queuePlayers.length === 0}
		<div class="empty">No players in queue</div>
	{:else}
		<div class="scroll-list">
			{#each queuePlayers as player}
				<div class="player-row">
					<UserAvatar
						username={player.username}
						displayName={player.displayName}
						avatarUrl={player.avatarUrl}
						size="xs"
					/>
					<div class="player-info">
						<span class="player-name">{player.username}</span>
						<span class="player-detail">
							{speedEmoji(player.queueSettings.speedPreset)} {capitalize(player.queueSettings.speedPreset)} · First to {player.queueSettings.winScore}
						</span>
					</div>
					<button class="btn-join" disabled={searching} onclick={() => onAcceptMatch(player.id)}>
						Join
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

	/* .player-username {
		font-size: 0.6rem;
		color: #6b7280;
	} */

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

	.btn-join {
		padding: 0.25rem 0.6rem;
		border-radius: 0.35rem;
		background: rgba(192, 132, 252, 0.08);
		color: #c084fc;
		border: 1px solid rgba(192, 132, 252, 0.15);
		font-size: 0.7rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.btn-join:hover {
		background: rgba(192, 132, 252, 0.12);
	}

	.btn-join:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
