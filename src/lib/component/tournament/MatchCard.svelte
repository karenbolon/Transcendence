<script lang="ts">
	import UserAvatar from '$lib/component/common/UserAvatar.svelte';

	let { match, currentUserId }: {
		match: {
			matchIndex: number;
			player1Id: number | null;
			player2Id: number | null;
			player1Username: string | null;
			player2Username: string | null;
			winnerId: number | null;
			player1Score: number | null;
			player2Score: number | null;
			status: 'pending' | 'playing' | 'finished' | 'bye';
		};
		currentUserId: number;
	} = $props();

	let isMyMatch = $derived(match.player1Id === currentUserId || match.player2Id === currentUserId);
	let p1Won = $derived(match.winnerId !== null && match.winnerId === match.player1Id);
	let p2Won = $derived(match.winnerId !== null && match.winnerId === match.player2Id);
</script>

<div class="match-card" class:my-match={isMyMatch} class:playing={match.status === 'playing'} class:bye={match.status === 'bye'}>
	<!-- Status dot -->
	<div class="status-dot"
		class:completed={match.status === 'finished'}
		class:in-progress={match.status === 'playing'}
		class:upcoming={match.status === 'pending'}
	></div>

	<div class="player" class:winner={p1Won} class:loser={match.status === 'finished' && !p1Won}>
		{#if match.player1Username}
			<UserAvatar username={match.player1Username} size="xs" />
			<span class="player-name">{match.player1Username}</span>
			{#if match.player1Score !== null && match.player1Score !== undefined}
				<span class="score">{match.player1Score}</span>
			{/if}
		{:else}
			<span class="player-name tbd">TBD</span>
		{/if}
	</div>

	<div class="player" class:winner={p2Won} class:loser={match.status === 'finished' && !p2Won}>
		{#if match.player2Username}
			<UserAvatar username={match.player2Username} size="xs" />
			<span class="player-name">{match.player2Username}</span>
			{#if match.player2Score !== null && match.player2Score !== undefined}
				<span class="score">{match.player2Score}</span>
			{/if}
		{:else}
			<span class="player-name tbd">TBD</span>
		{/if}
	</div>
</div>

<style>
	.match-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
		min-width: 160px;
		overflow: hidden;
		position: relative;
		transition: border-color 0.2s;
	}

	.match-card.my-match {
		border-color: rgba(255, 107, 157, 0.4);
		box-shadow: 0 0 12px rgba(255, 107, 157, 0.1);
	}

	.match-card.playing {
		border-color: rgba(251, 191, 36, 0.4);
	}

	.match-card.bye {
		opacity: 0.4;
	}

	/* Status dot */
	.status-dot {
		position: absolute;
		right: -4px;
		top: 50%;
		transform: translateY(-50%);
		width: 8px;
		height: 8px;
		border-radius: 50%;
		z-index: 1;
	}

	.status-dot.completed { background: #4ade80; }
	.status-dot.in-progress { background: #fbbf24; }
	.status-dot.upcoming { background: rgba(255, 255, 255, 0.15); }

	/* Player rows */
	.player {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.45rem 0.7rem;
		font-size: 0.8rem;
		color: #9ca3af;
		transition: all 0.15s;
	}

	.player:first-of-type {
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	}

	.player.winner {
		background: rgba(74, 222, 128, 0.06);
		color: #f3f4f6;
		font-weight: 600;
	}

	.player.loser {
		opacity: 0.5;
	}

	.player-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.player-name.tbd {
		color: #4b5563;
		font-style: italic;
	}

	.score {
		margin-left: auto;
		font-weight: 700;
		font-size: 0.75rem;
		color: #9ca3af;
		min-width: 1rem;
		text-align: right;
	}

	.winner .score {
		color: #4ade80;
	}
</style>
