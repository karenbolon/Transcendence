<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatDate, formatDuration } from '$lib/utils/format_date';
	import { speedEmoji, formatMode, modeEmoji } from '$lib/utils/format_game';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let loading = $state(false);

	// Build URL with all current filters preserved
	function buildUrl(overrides: Record<string, string | null> = {}) {
		const params = new URLSearchParams();

		const values: Record<string, string | null> = {
			//type: data.gameType,
			mode: data.gameMode,
			result: data.result,
			sort: data.sort === 'oldest' ? 'oldest' : null, // only set if not default
			limit: null, // reset limit when changing filters
			...overrides,
		};

		for (const [key, value] of Object.entries(values)) {
			if (value) params.set(key, value);
		}

		return `/match-history?${params}`;
	}

	// function filterByType(type: string | null) {
	// 	goto(buildUrl({ type }));
	// }

	function filterByMode(mode: string | null) {
		goto(buildUrl({ mode }));
	}

	function filterByResult(result: string | null) {
		goto(buildUrl({ result }));
	}

	function toggleSort() {
		const newSort = data.sort === 'oldest' ? null : 'oldest';
		goto(buildUrl({ sort: newSort }));
	}

	function loadMore() {
		loading = true;
		const nextLimit = String(data.limit + 10);
		goto(buildUrl({ limit: nextLimit }), { keepFocus: true, noScroll: true });
		loading = false;
	}
</script>

<div class="match-history-page">
	<!-- Header -->
	<div class="page-header">
		<a href="/profile" class="back-link">← Back to Profile</a>
		<h1 class="page-title">Match History</h1>
	</div>

	<!-- Game type tabs -->
	<!-- if we implement more game would be and if -->
	<div class="game-tabs">
		<button
			class="game-tab"
			class:active={data.gameMode === null}
			onclick={() => filterByMode(null)}
		>
			🎮 All
		</button>
		<button
			class="game-tab"
			class:active={data.gameMode === 'local'}
			onclick={() => filterByMode('local')}
		>
			👥 Local
		</button>
		<button
			class="game-tab"
			class:active={data.gameMode === 'online'}
			onclick={() => filterByMode('online')}
		>
			🌐 Online
		</button>
		<button
			class="game-tab"
			class:active={data.gameMode === 'computer'}
			onclick={() => filterByMode('computer')}
		>
			🤖 Computer
		</button>
	</div>


	<!-- Filters bar -->
	<div class="filters-bar">
		<!-- Result filter -->
		<div class="filter-group">
			<button
				class="filter-btn"
				class:active={data.result === null}
				onclick={() => filterByResult(null)}
			>
				All
			</button>
			<button
				class="filter-btn filter-wins"
				class:active={data.result === 'wins'}
				onclick={() => filterByResult('wins')}
			>
				Wins
			</button>
			<button
				class="filter-btn filter-losses"
				class:active={data.result === 'losses'}
				onclick={() => filterByResult('losses')}
			>
				Losses
			</button>
		</div>

		<!-- Sort toggle -->
		<button class="sort-btn" onclick={toggleSort}>
			{data.sort === 'oldest' ? '↑ Oldest first' : '↓ Newest first'}
		</button>
	</div>

	<!-- Matches list -->
	{#if data.matches.length === 0}
		<div class="empty-state">
			<h3>No matches found</h3>
			<p>Play some games to see your history here!</p>
			<a href="/play" class="play-link">Play Now →</a>
		</div>
	{:else}
		<div class="matches-list">
			{#each data.matches as match (match.id)}
				<div
					class="match-row"
					class:won={match.won}
					class:lost={!match.won}
				>
					<span class="match-result">
						{match.won ? 'W' : 'L'}
					</span>

					<span class="match-score">
						<span class="user-score">{match.userScore}</span>
						<span class="score-divider">–</span>
						<span class="opponent-score">{match.opponentScore}</span>
					</span>

					<span class="match-opponent">{match.opponentName}</span>
					<span class="match-mode">{formatMode(match.gameMode)}</span>
					<span class="match-speed">{speedEmoji(match.speedPreset)}</span>
					<span class="match-duration">{formatDuration(match.durationSeconds)}</span>
					<span class="match-time">{formatDate(match.playedAt)}</span>
				</div>
			{/each}
		</div>

		<!-- Load more button -->
		{#if data.hasMore}
			<button
				class="load-more-btn"
				onclick={loadMore}
				disabled={loading}
			>
				{loading ? 'Loading...' : 'Load more'}
			</button>
		{/if}
	{/if}
</div>

<style>
	.match-history-page {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* Header */
	.page-header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.back-link {
		font-size: 0.8rem;
		color: #7a7a9e;
		text-decoration: none;
		transition: color 0.15s;
	}

	.back-link:hover {
		color: #ff6b9d;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 900;
		color: #d1d5db;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.page-title::before {
		content: '';
		width: 3px;
		height: 20px;
		border-radius: 2px;
		background: #ff6b9d;
	}

	/* ═══════════════════════════════════════
		GAME TYPE TABS
		═══════════════════════════════════════ */
	.game-tabs {
		display: flex;
		gap: 0.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding-bottom: 0.5rem;
	}

	.game-tab {
		padding: 0.4rem 1rem;
		border-radius: 0.5rem 0.5rem 0 0;
		border: none;
		background: none;
		color: #5a5a7e;
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.game-tab:hover {
		color: #9ca3af;
	}

	.game-tab.active {
		color: #ff6b9d;
		background: rgba(255, 107, 157, 0.08);
		border-bottom: 2px solid #ff6b9d;
	}

	/* ═══════════════════════════════════════
		FILTERS BAR
		═══════════════════════════════════════ */
	.filters-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
	}

	.filter-group {
		display: flex;
		gap: 0.25rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 0.5rem;
		padding: 0.2rem;
	}

	.filter-btn {
		padding: 0.3rem 0.75rem;
		border-radius: 0.4rem;
		border: none;
		background: none;
		color: #5a5a7e;
		font-family: inherit;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}

	.filter-btn:hover {
		color: #9ca3af;
	}

	.filter-btn.active {
		background: rgba(255, 255, 255, 0.08);
		color: #d1d5db;
	}

	.filter-btn.filter-wins.active {
		background: rgba(74, 222, 128, 0.1);
		color: #4ade80;
	}

	.filter-btn.filter-losses.active {
		background: rgba(248, 113, 113, 0.1);
		color: #f87171;
	}

	.sort-btn {
		padding: 0.3rem 0.75rem;
		border-radius: 0.4rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: none;
		color: #7a7a9e;
		font-family: inherit;
		font-size: 0.72rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	.sort-btn:hover {
		border-color: rgba(255, 255, 255, 0.15);
		color: #d1d5db;
	}
	/* Match list (same styles as profile page) */
	.matches-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.match-row {
		display: grid;
		grid-template-columns: 32px 70px 1fr 100px 32px 60px 70px;
		align-items: center;
		gap: 0.6rem;
		padding: 0.65rem 0.85rem;
		border-radius: 0.6rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid transparent;
		font-size: 0.85rem;
		border-left: 2px solid transparent;
		transition: all 0.2s;
	}

	.match-row:nth-child(even) { background: rgba(255, 255, 255, 0.02); }
	.match-row:nth-child(odd) { background: rgba(255, 255, 255, 0.05); }
	.match-row:hover { background: rgba(255, 255, 255, 0.04); }
	.match-row.won  { border-left-color: rgba(74, 222, 128, 0.4); }
	.match-row.lost { border-left-color: rgba(248, 113, 113, 0.3); }

	.match-result {
		font-size: 0.8rem;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}

	.match-row.won .match-result  { background: rgba(74, 222, 128, 0.12); color: #4ade80; }
	.match-row.lost .match-result { background: rgba(248, 113, 113, 0.1); color: #f87171; }

	.match-score { display: flex; align-items: center; gap: 0.3rem; font-weight: 600; }
	.user-score { color: #f3f4f6; }
	.score-divider { color: #4b5563; }
	.opponent-score { color: #9ca3af; }

	.match-opponent {
		color: #d1d5db;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.match-mode { color: #6b7280; font-size: 0.75rem; }
	.match-speed { text-align: center; }
	.match-duration { color: #6b7280; font-size: 0.8rem; text-align: right; }
	.match-time { color: #4b5563; font-size: 0.75rem; text-align: right; }

	/* Load more button */
	.load-more-btn {
		margin: 1rem auto 0;
		padding: 0.6rem 2rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 107, 157, 0.3);
		background: rgba(255, 107, 157, 0.08);
		color: #ff6b9d;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}

	.load-more-btn:hover:not(:disabled) {
		background: rgba(255, 107, 157, 0.15);
		border-color: rgba(255, 107, 157, 0.5);
	}

	.load-more-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Empty state */
	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: #6b7280;
	}

	.play-link {
		color: #ff6b9d;
		text-decoration: none;
		font-weight: 500;
	}

	.play-link:hover {
		text-decoration: underline;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.match-row {
			grid-template-columns: 28px 60px 1fr 60px;
			font-size: 0.8rem;
		}

		.match-mode,
		.match-speed,
		.match-duration {
			display: none;
		}
	}
</style>
