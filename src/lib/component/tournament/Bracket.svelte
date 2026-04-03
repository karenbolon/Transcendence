<script lang="ts">
	import MatchCard from './MatchCard.svelte';

	let { bracket, currentUserId, tournamentName = '', currentRound = 1, tournamentId = 0 }: {
		bracket: Array<{
			round: number;
			matches: Array<{
				matchIndex: number;
				player1Id: number | null;
				player2Id: number | null;
				player1Username: string | null;
				player2Username: string | null;
				winnerId: number | null;
				player1Score: number | null;
				player2Score: number | null;
				status: 'pending' | 'playing' | 'finished' | 'bye';
			}>;
		}>;
		currentUserId: number;
		tournamentName?: string;
		currentRound?: number;
		tournamentId?: number;
	} = $props();

	let totalRounds = $derived(bracket.length);

	// Count remaining active players
	let playersRemaining = $derived(() => {
		// Players who haven't been eliminated yet
		const eliminated = new Set<number>();
		for (const round of bracket) {
			for (const match of round.matches) {
				if (match.status === 'finished' && match.winnerId) {
					const loserId = match.winnerId === match.player1Id ? match.player2Id : match.player1Id;
					if (loserId) eliminated.add(loserId);
				}
			}
		}
		// Count all unique players minus eliminated
		const allPlayers = new Set<number>();
		for (const round of bracket) {
			for (const match of round.matches) {
				if (match.player1Id) allPlayers.add(match.player1Id);
				if (match.player2Id) allPlayers.add(match.player2Id);
			}
		}
		return allPlayers.size - eliminated.size;
	});

	function roundLabel(round: number): string {
		const fromFinal = totalRounds - round;
		if (fromFinal === 0) return 'FINAL';
		if (fromFinal === 1) return 'SEMIFINALS';
		if (fromFinal === 2) return 'QUARTERFINALS';
		return `ROUND ${round}`;
	}

	function roundColor(round: number): string {
		const fromFinal = totalRounds - round;
		if (fromFinal === 0) return '#ff6b9d';
		if (fromFinal === 1) return '#4ade80';
		return '#6b7280';
	}

	// Check if tournament is finished
	let isFinished = $derived(
		bracket.length > 0 &&
		bracket[bracket.length - 1].matches.every(m => m.status === 'finished')
	);

	let championUsername = $derived.by(() => {
		if (!isFinished) return null;
		const finalRound = bracket[bracket.length - 1];
		const finalMatch = finalRound?.matches[0];
		if (!finalMatch?.winnerId) return null;
		return finalMatch.winnerId === finalMatch.player1Id
			? finalMatch.player1Username
			: finalMatch.player2Username;
	});
</script>

<div class="bracket-container">
	<!-- Header -->
	{#if tournamentName}
		<div class="bracket-header">
			<span class="live-label">{isFinished ? 'FINISHED' : 'LIVE'}</span>
			<h2 class="bracket-title">{tournamentName}</h2>
			<p class="bracket-sub">
				{#if isFinished}
					Tournament complete
				{:else}
					Round {currentRound} of {totalRounds} · {playersRemaining()} players remaining
				{/if}
			</p>
		</div>
	{/if}

	<!-- Bracket Grid -->
	<div class="bracket" style="--rounds: {bracket.length}">
		{#each bracket as round, roundIdx}
			<div class="round">
				<h3 class="round-title" style="color: {roundColor(round.round)}">
					{roundLabel(round.round)}
				</h3>
				<div class="round-matches">
					{#each round.matches as match}
						<MatchCard {match} {currentUserId} {tournamentId} round={round.round} />
					{/each}
				</div>
			</div>

			{#if roundIdx < bracket.length - 1}
				<!-- Connector lines between rounds -->
				<div class="connectors">
					{#each { length: Math.ceil(bracket[roundIdx].matches.length / 2) } as _, i}
						<div class="connector-pair">
							<div class="connector-line top"></div>
							<div class="connector-line bottom"></div>
							<div class="connector-merge"></div>
						</div>
					{/each}
				</div>
			{/if}
		{/each}

		<!-- Final connector to champion -->
		<div class="champion-connector">
			<div class="champion-line"></div>
		</div>

		<!-- Champion slot -->
		<div class="champion-slot">
			{#if isFinished && championUsername}
				<div class="champion-icon">🏆</div>
				<span class="champion-text">{championUsername}</span>
			{:else}
				<div class="champion-icon trophy-pending">🏆</div>
				<span class="champion-text pending">Champion</span>
			{/if}
		</div>
	</div>

	<!-- Legend -->
	<div class="legend">
		<div class="legend-item">
			<span class="legend-dot completed"></span>
			<span>Completed</span>
		</div>
		<div class="legend-item">
			<span class="legend-dot in-progress"></span>
			<span>In progress</span>
		</div>
		<div class="legend-item">
			<span class="legend-dot upcoming"></span>
			<span>Upcoming</span>
		</div>
	</div>
</div>

<style>
	.bracket-container {
		width: 100%;
	}

	/* ── Header ─────────────────────────── */
	.bracket-header {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.live-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: #4ade80;
	}

	.bracket-title {
		font-size: 1.4rem;
		font-weight: 800;
		color: #f3f4f6;
		margin: 0.2rem 0 0.3rem;
	}

	.bracket-sub {
		font-size: 0.8rem;
		color: #6b7280;
		margin: 0;
	}

	/* ── Bracket Grid ───────────────────── */
	.bracket {
		display: flex;
		overflow-x: auto;
		padding: 1rem 0;
		align-items: stretch;
		gap: 0;
	}

	.round {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 170px;
	}

	.round-title {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		text-align: center;
		margin: 0;
	}

	.round-matches {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		justify-content: space-around;
		flex: 1;
	}

	/* ── Connector Lines ────────────────── */
	.connectors {
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		width: 28px;
		flex-shrink: 0;
	}

	.connector-pair {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		flex: 1;
		position: relative;
	}

	.connector-line {
		flex: 1;
		border-right: 2px solid rgba(255, 255, 255, 0.1);
		margin-right: 50%;
	}

	.connector-line.top {
		border-bottom: 2px solid rgba(255, 255, 255, 0.1);
		border-bottom-right-radius: 6px;
	}

	.connector-line.bottom {
		border-top: 2px solid rgba(255, 255, 255, 0.1);
		border-top-right-radius: 6px;
	}

	.connector-merge {
		position: absolute;
		right: 0;
		top: 50%;
		width: 50%;
		border-top: 2px solid rgba(255, 255, 255, 0.1);
	}

	/* ── Champion Connector ─────────────── */
	.champion-connector {
		display: flex;
		align-items: center;
		width: 20px;
		flex-shrink: 0;
	}

	.champion-line {
		width: 100%;
		border-top: 2px solid rgba(255, 255, 255, 0.1);
	}

	/* ── Champion Slot ──────────────────── */
	.champion-slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		padding: 0 0.5rem;
	}

	.champion-icon {
		font-size: 2rem;
	}

	.champion-icon.trophy-pending {
		opacity: 0.3;
	}

	.champion-text {
		font-size: 0.75rem;
		font-weight: 600;
		color: #fbbf24;
	}

	.champion-text.pending {
		color: #4b5563;
	}

	/* ── Legend ──────────────────────────── */
	.legend {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.04);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.7rem;
		color: #6b7280;
	}

	.legend-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.legend-dot.completed { background: #4ade80; }
	.legend-dot.in-progress { background: #fbbf24; }
	.legend-dot.upcoming { background: rgba(255, 255, 255, 0.15); }
</style>
