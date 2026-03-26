<script lang="ts">
	import MatchCard from './MatchCard.svelte';

	let { bracket, currentUserId }: {
		bracket: Array<{
			round: number;
			matches: Array<{
				matchIndex: number;
				player1Id: number | null;
				player2Id: number | null;
				player1Username: string | null;
				player2Username: string | null;
				winnerId: number | null;
				status: 'pending' | 'playing' | 'finished' | 'bye';
			}>;
		}>;
		currentUserId: number;
	} = $props();

	function roundLabel(round: number, totalRounds: number): string {
		if (round === totalRounds) return 'Final';
		if (round === totalRounds - 1) return 'Semifinals';
		if (round === totalRounds - 2) return 'Quarterfinals';
		return `Round ${round}`;
	}
</script>

<div class="bracket" style="--rounds: {bracket.length}">
	{#each bracket as round}
		<div class="round">
			<h3 class="round-title">{roundLabel(round.round, bracket.length)}</h3>
			<div class="round-matches">
				{#each round.matches as match}
					<MatchCard {match} {currentUserId} />
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.bracket {
		display: grid;
		grid-template-columns: repeat(var(--rounds), 1fr);
		gap: 24px;
		overflow-x: auto;
		padding: 16px 0;
	}
	.round {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.round-title {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #888;
		text-align: center;
		margin: 0;
	}
	.round-matches {
		display: flex;
		flex-direction: column;
		gap: 16px;
		justify-content: space-around;
		flex: 1;
	}
</style>
