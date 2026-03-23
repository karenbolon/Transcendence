<script lang="ts">
	import type { PageData } from './$types';
	import { RANK_MEDALS } from '$lib/utils/format_progression';
	import UserAvatar from '$lib/component/UserAvatar.svelte';

	let { data }: { data: PageData } = $props();

	// Top 3 for the podium, rest for the table
	let podium = $derived(data.rankings.slice(0, 3));
	let rest = $derived(data.rankings.slice(3));
</script>

<div class="leaderboard-page">
	<div class="page-header">
		<div class="header-left">
			<h1 class="page-title">Leaderboard</h1>
			{#if data.myRank}
				<span class="my-rank">
					<span class="rank-label">You rank: #{data.myRank}</span>
				</span>
			{:else if data.isLoggedIn}
				<span class="my-rank unranked">
					<span class="rank-label">Unranked</span>
				</span>
			{/if}
		</div>

		<!-- TAB SWITCHER -->
		<div class="tab-group">
			<button>
				<a href="/leaderboard"
				class="tab-pill"
				class:active={data.tab === 'global'} >
					🌐 Global
				</a>
			</button>
			{#if data.isLoggedIn}
				<button>
					<a href="/leaderboard?tab=friends"
						class="tab-pill"
						class:active={data.tab === 'friends'}>
						👥 Friends
					</a>
				</button>
			{/if}
		</div>
	</div>

	{#if data.rankings.length === 0}
		<!-- ═══ EMPTY STATE ═══ -->
		<div class="empty-state">
			{#if data.tab === 'friends'}
				<span class="empty-emoji">👥</span>
				<p>Add friends to see their rankings here!</p>
				<a href="/leaderboard" class="play-link">View global leaderboard →</a>
			{:else}
				<span class="empty-emoji">🏆</span>
				<p>No games played yet!</p>
				<a href="/play" class="play-link">Be the first to play →</a>
			{/if}
		</div>
	{:else}
		<!-- ═══ PODIUM (Top 3) ═══ -->
		{#if podium.length > 0}
			<section class="podium">
				<!-- Show in order: 2nd, 1st, 3rd for visual effect -->
				{#each [1, 0, 2] as pos}
					{#if podium[pos]}
						{@const player = podium[pos]}
						<a
							href="/friends/{player.id}"
							class="podium-card rank-{pos + 1}"
							class:is-me={player.id === data.myId}
						>
							<span class="medal">{RANK_MEDALS[pos]}</span>
							<UserAvatar
								username={player.username}
								displayName={player.name}
								avatarUrl={player.avatarUrl}
								size="md"
							/>
							<span class="podium-name">
								{player.name || player.username}
																{#if player.id === data.myId}<span class="you-badge">You</span>{/if}
							</span>
							<span class="podium-wins">{player.wins} wins</span>
							<div class="podium-stats">
								<span class="podium-games">{player.totalGames} games</span>
								<span class="podium-sep">·</span>
								<span class="podium-rate">{player.winRate}%</span>
							</div>
						</a>
					{/if}
				{/each}
			</section>
		{/if}

		<!-- ═══ RANKINGS TABLE ═══ -->
		<section class="rankings-table">
			<div class="table-header">
				<span class="col-rank">#</span>
				<span class="col-player">Player</span>
				<span class="col-games">Games</span>
				<span class="col-wins">Wins</span>
				<span class="col-losses">Losses</span>
				<span class="col-rate">Win %</span>
			</div>

			<!-- Show top 3 in table too if no separate table rows -->
			{#if rest.length === 0}
				{#each podium as player}
					<a href="/friends/{player.id}" class="table-row"  class:is-me={player.id === data.myId}>
						<span class="col-rank rank-num">{RANK_MEDALS[player.rank - 1]}</span>
						<span class="col-player">

							<UserAvatar
								username={player.username}
								displayName={player.name}
								avatarUrl={player.avatarUrl}
								size="xs"
							/>
							<span class="player-name-text">
								{player.name || player.username}
																{#if player.id === data.myId}<span class="you-badge-sm">You</span>{/if}
							</span>
						</span>
						<span class="col-games">{player.totalGames}</span>
						<span class="col-wins">{player.wins}</span>
						<span class="col-losses">{player.losses}</span>
						<span class="col-rate">{player.winRate}%</span>
					</a>
				{/each}
			{:else}
				{#each rest as player}
					<a href="/friends/{player.id}" class="table-row" class:is-you={player.id === data.myId}>
						<span class="col-rank rank-num">{player.rank}</span>
						<span class="col-player">
							<UserAvatar
								username={player.username}
								displayName={player.name}
								avatarUrl={player.avatarUrl}
								size="sm"
							/>
							<span class="player-name-text">
								{player.name || player.username}
																{#if player.id === data.myId}<span class="you-badge-sm">You</span>{/if}
							</span>
						</span>
						<span class="col-games">{player.totalGames}</span>
						<span class="col-wins">{player.wins}</span>
						<span class="col-losses">{player.losses}</span>
						<span class="col-rate">{player.winRate}%</span>
					</a>
				{/each}
			{/if}
		</section>
	{/if}
</div>

<style>
	.leaderboard-page {
		max-width: 1300px;
		width: 100%;
		margin: 0 auto;
		padding: 2rem 4rem;
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}

	/* ═══ HEADER ═══ */
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.header-left {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #fff;
		margin: 0;
	}

	.your-rank {
		font-size: 0.75rem;
		color: var(--accent, #ff6b9d);
		font-weight: 600;
		background: rgba(255, 107, 157, 0.1);
		padding: 0.2rem 0.6rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 107, 157, 0.15);
	}

	/* ── Tabs ── */
	.tab-group {
		display: flex;
		gap: 0.25rem;
		background: rgba(0, 0, 0, 0.3);
		padding: 0.25rem;
		border-radius: 0.5rem;
	}

	.tab-pill {
		padding: 0.46rem 1.25rem;
		border: none;
		border-radius: 0.4rem;
		background: transparent;
		color: #6b7280;
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}

	.tab-pill:hover { color: #d1d5db; }

	.tab-pill.active {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
		font-weight: 600;
	}

	/* ═══ EMPTY STATE ═══ */
	.empty-state {
		text-align: center;
		padding: 3rem 2rem;
		color: #5a5a7e;
		background: rgba(255, 255, 255, 0.02);
		border: 1px dashed rgba(255, 255, 255, 0.06);
		border-radius: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.empty-emoji { font-size: 2rem; }

	.play-link {
		color: var(--accent, #ff6b9d);
		text-decoration: none;
		font-weight: 500;
		font-size: 0.85rem;
	}

	.play-link:hover { text-decoration: underline; }

	/* ═══ PODIUM ═══ */
	.podium {
		display: flex;
		justify-content: center;
		align-items: flex-end;
		gap: 1.5rem;
	}

	.podium-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 1.25rem 2.9rem;
		border-radius: 0.85rem;
		min-width: 130px;
		text-decoration: none;
		transition: all 0.25s;
		position: relative;
		overflow: hidden;
		border: 1px solid transparent;
		transition: background 0.15s;
	}

	.podium-card::before {
		content: '';
		position: absolute;
		top: 0; left: 0; right: 0;
		height: 2px;
		opacity: 0.6;
	}

	.podium-card:hover { transform: translateY(-3px); }

	/* 1st place — tallest */
	.podium-card.rank-1 {
		background: rgba(255, 215, 0, 0.04);
		border-color: rgba(255, 215, 0, 0.12);
		padding-bottom: 2.5rem;
		order: 2;
	}
	.podium-card.rank-1::before { background: linear-gradient(90deg, transparent, #ffd700, transparent); }
	.podium-card.rank-1:hover { border-color: rgba(255, 215, 0, 0.25); box-shadow: 0 8px 30px rgba(255, 215, 0, 0.06); }

	/* 2nd place */
	.podium-card.rank-2 {
		background: rgba(192, 192, 210, 0.03);
		border-color: rgba(192, 192, 210, 0.1);
		order: 1;
	}
	.podium-card.rank-2::before { background: linear-gradient(90deg, transparent, #c0c0d2, transparent); }
	.podium-card.rank-2:hover { border-color: rgba(192, 192, 210, 0.2); box-shadow: 0 8px 30px rgba(192, 192, 210, 0.04); }

	/* 3rd place */
	.podium-card.rank-3 {
		background: rgba(205, 127, 50, 0.03);
		border-color: rgba(205, 127, 50, 0.1);
		order: 3;
	}
	.podium-card.rank-3::before { background: linear-gradient(90deg, transparent, #cd7f32, transparent); }
	.podium-card.rank-3:hover { border-color: rgba(205, 127, 50, 0.2); box-shadow: 0 8px 30px rgba(205, 127, 50, 0.04); }

	/* "You" highlight on podium */
	.podium-card.is-you {
		box-shadow: 0 0 0 1px rgba(255, 107, 157, 0.15), 0 0 20px rgba(255, 107, 157, 0.05);
	}

	.medal { font-size: 3.5rem; }

	/* .podium-name {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		max-width: 100%;
		color: #e5e7eb;
		font-weight: 600;
		font-size: 0.85rem;
	}

	.podium-name-text {
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	} */

	.you-badge {
		font-size: 0.55rem;
		padding: 0.1rem 0.35rem;
		border-radius: 1rem;
		background: rgba(255, 107, 157, 0.15);
		color: var(--accent, #ff6b9d);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.podium-username {
		display: block;
		font-size: 0.65rem;
		color: #6b7280;
		font-weight: 400;
	}

	.player-username {
		display: block;
		font-size: 0.6rem;
		color: #6b7280;
		font-weight: 400;
	}

	.podium-wins {
		color: #4ade80;
		font-weight: 600;
		font-size: 0.85rem;
	}

	.podium-stats {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.7rem;
		color: #7a7a9e;
	}

	.podium-sep { opacity: 0.4; }

	.podium-rate { color: var(--accent, #ff6b9d); font-weight: 600; }

	/* ═══ TABLE ═══ */
	.rankings-table {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.table-header,
	.table-row {
		display: grid;
		grid-template-columns: 42px 1fr 65px 55px 60px 60px;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.85rem;
		font-size: 0.92rem;
	}

	.table-header {
		color: #5a5a7e;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding-bottom: 0.75rem;
	}

	.table-row {
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		text-decoration: none;
		transition: all 0.15s;
		border: 1px solid transparent;
	}

	.table-row:hover {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.04);
	}

	/* Highlight your row */
	.table-row.is-you {
		background: rgba(255, 107, 157, 0.04);
		border-color: rgba(255, 107, 157, 0.1);
	}

	.table-row.is-you:hover {
		background: rgba(255, 107, 157, 0.07);
		border-color: rgba(255, 107, 157, 0.15);
	}

	.table-row:nth-child(odd) {
		background: rgba(255, 255, 255, 0.02);
	}

	.table-row:nth-child(even) {
		background: rgba(255, 255, 255, 0.05);
	}

	.col-rank {
		color: #5a5a7e;
		font-weight: 600;
	}

	.rank-num { font-size: 0.85rem; }

	.col-player {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		color: #d1d5db;
		font-weight: 500;
		overflow: hidden;
	}

	.player-avatar-wrap { position: relative; flex-shrink: 0; }

	.online-dot-sm {
		position: absolute;
		bottom: -1px;
		right: -1px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #4ade80;
		border: 2px solid #16163a;
		box-shadow: 0 0 4px rgba(74, 222, 128, 0.5);
	}

	.player-name-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}



	.you-badge-sm {
		font-size: 0.5rem;
		padding: 0.08rem 0.3rem;
		border-radius: 1rem;
		background: rgba(255, 107, 157, 0.15);
		color: var(--accent, #ff6b9d);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		flex-shrink: 0;
	}

	.col-games {
		color: #9ca3af;
		text-align: center;
	}

	.col-wins {
		color: #4ade80;
		font-weight: 600;
		text-align: center;
	}

	.col-losses {
		color: #f87171;
		text-align: center;
	}

	.col-rate {
		color: var(--accent, #ff6b9d);
		font-weight: 600;
		text-align: right;
	}

	/* ═══ RESPONSIVE ═══ */
	@media (max-width: 640px) {
		.leaderboard-page {
			padding: 1.5rem 1rem 3rem;
		}

		.page-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.podium {
			gap: 0.5rem;
		}

		.podium-card {
			padding: 1rem 0.75rem;
			min-width: 95px;
		}

		.table-header,
		.table-row {
			grid-template-columns: 36px 1fr 55px 55px;
		}

		.col-losses,
		.col-rate {
			display: none;
		}
	}

	.rank-label {
		font-size: 0.85rem;
		color: var(--accent, #ff6b9d);
		font-weight: 600;
		background: rgba(255, 107, 157, 0.1);
		padding: 0.3rem 0.6rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 107, 157, 0.15);
	}
</style>