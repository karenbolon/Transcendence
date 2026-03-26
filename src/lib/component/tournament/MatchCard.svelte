<script lang="ts">
	let { match, currentUserId }: {
		match: {
			matchIndex: number;
			player1Id: number | null;
			player2Id: number | null;
			player1Username: string | null;
			player2Username: string | null;
			winnerId: number | null;
			status: 'pending' | 'playing' | 'finished' | 'bye';
		};
		currentUserId: number;
	} = $props();

	let isMyMatch = $derived(match.player1Id === currentUserId || match.player2Id === currentUserId);
</script>

<div class="match-card" class:my-match={isMyMatch} class:playing={match.status === 'playing'} class:finished={match.status === 'finished'} class:bye={match.status === 'bye'}>
	{#if match.status === 'playing'}
		<span class="badge live">LIVE</span>
	{:else if match.status === 'bye'}
		<span class="badge bye-badge">BYE</span>
	{/if}

	<div class="player" class:winner={match.winnerId === match.player1Id && match.status === 'finished'}>
		<span class="player-name">{match.player1Username ?? 'TBD'}</span>
	</div>

	<div class="vs">vs</div>

	<div class="player" class:winner={match.winnerId === match.player2Id && match.status === 'finished'}>
		<span class="player-name">{match.player2Username ?? 'TBD'}</span>
	</div>
</div>

<style>
	.match-card {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 10px 14px;
		min-width: 160px;
		position: relative;
		transition: border-color 0.2s;
	}
	.match-card.my-match {
		border-color: var(--accent);
		box-shadow: 0 0 12px var(--accent-muted);
	}
	.match-card.playing {
		border-color: #fbbf24;
	}
	.match-card.bye {
		opacity: 0.5;
	}
	.badge {
		position: absolute;
		top: -8px;
		right: 8px;
		font-size: 0.6rem;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.live {
		background: #fbbf24;
		color: #000;
		animation: pulse 1.5s infinite;
	}
	.bye-badge {
		background: rgba(255, 255, 255, 0.2);
		color: #aaa;
	}
	.player {
		padding: 4px 0;
		font-size: 0.85rem;
		color: #ccc;
	}
	.player.winner {
		color: #4ade80;
		font-weight: 600;
	}
	.player-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: block;
	}
	.vs {
		font-size: 0.65rem;
		color: #666;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}
</style>
