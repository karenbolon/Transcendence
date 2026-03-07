<!-- ═══════════════════════════════════════════════════════════════════════════
     🏆 LEADERBOARD PAGE — src/routes/(app)/leaderboard/+page.svelte

     Shows player rankings based on match history.
     Top 3 get special podium treatment, rest in a clean table.
     Viewable by anyone (no login required).
═══════════════════════════════════════════════════════════════════════════ -->
<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Top 3 for the podium, rest for the table
	const podium = data.rankings.slice(0, 3);
	const rest = data.rankings.slice(3);

	// Medal emojis for top 3
	const medals = ['🥇', '🥈', '🥉'];
</script>

<div class="leaderboard-page">
	<h1 class="page-title">Leaderboard</h1>

	{#if data.rankings.length === 0}
		<!-- ═══ EMPTY STATE ═══ -->
		<div class="empty-state">
			<p>No games played yet!</p>
			<a href="/play" class="play-link">Be the first to play →</a>
		</div>
	{:else}
		<!-- ═══ PODIUM (Top 3) ═══ -->
		{#if podium.length > 0}
			<section class="podium">
				{#each podium as player, i}
					<div class="podium-card rank-{i + 1}">
						<span class="medal">{medals[i]}</span>
						<div class="podium-avatar">
							{#if player.avatarUrl}
								<img src={player.avatarUrl} alt="" class="podium-avatar-img" />
							{:else}
								<span class="podium-initial">{player.username[0].toUpperCase()}</span>
							{/if}
						</div>
						<span class="podium-name">{player.username}</span>
						<span class="podium-wins">{player.wins} wins</span>
						<span class="podium-rate">{player.winRate}% rate</span>
					</div>
				{/each}
			</section>
		{/if}

		<!-- ═══ RANKINGS TABLE ═══ -->
		{#if rest.length > 0}
			<section class="rankings-table">
				<div class="table-header">
					<span class="col-rank">#</span>
					<span class="col-player">Player</span>
					<span class="col-games">Games</span>
					<span class="col-wins">Wins</span>
					<span class="col-losses">Losses</span>
					<span class="col-rate">Win %</span>
				</div>

				{#each rest as player}
					<div class="table-row">
						<span class="col-rank">{player.rank}</span>
						<span class="col-player">
							<span class="row-avatar">
								{#if player.avatarUrl}
									<img src={player.avatarUrl} alt="" class="row-avatar-img" />
								{:else}
									<span class="row-initial">{player.username[0].toUpperCase()}</span>
								{/if}
							</span>
							{player.username}
						</span>
						<span class="col-games">{player.totalGames}</span>
						<span class="col-wins">{player.wins}</span>
						<span class="col-losses">{player.losses}</span>
						<span class="col-rate">{player.winRate}%</span>
					</div>
				{/each}
			</section>
		{/if}

		<!-- ═══ FULL RANKINGS TABLE (shown when <= 3 players, no separate table) ═══ -->
		{#if podium.length > 0 && rest.length === 0}
			<section class="rankings-table">
				<div class="table-header">
					<span class="col-rank">#</span>
					<span class="col-player">Player</span>
					<span class="col-games">Games</span>
					<span class="col-wins">Wins</span>
					<span class="col-losses">Losses</span>
					<span class="col-rate">Win %</span>
				</div>
				{#each podium as player}
					<div class="table-row">
						<span class="col-rank">{medals[player.rank - 1]}</span>
						<span class="col-player">
							<span class="row-avatar">
								{#if player.avatarUrl}
									<img src={player.avatarUrl} alt="" class="row-avatar-img" />
								{:else}
									<span class="row-initial">{player.username[0].toUpperCase()}</span>
								{/if}
							</span>
							{player.username}
						</span>
						<span class="col-games">{player.totalGames}</span>
						<span class="col-wins">{player.wins}</span>
						<span class="col-losses">{player.losses}</span>
						<span class="col-rate">{player.winRate}%</span>
					</div>
				{/each}
			</section>
		{/if}
	{/if}
</div>

<style>
	.leaderboard-page {
		max-width: 650px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #f3f4f6;
		margin: 0;
	}

	/* ═════════════════════════════════════════════════
	   EMPTY STATE
	   ═════════════════════════════════════════════════ */
	.empty-state {
		text-align: center;
		padding: 3rem;
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

	/* ═════════════════════════════════════════════════
	   PODIUM (Top 3)
	   ═════════════════════════════════════════════════ */
	.podium {
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.podium-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 1.25rem 1.5rem;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		min-width: 120px;
	}

	.podium-card.rank-1 {
		border-color: rgba(255, 215, 0, 0.2);
		background: rgba(255, 215, 0, 0.03);
	}

	.podium-card.rank-2 {
		border-color: rgba(192, 192, 192, 0.2);
		background: rgba(192, 192, 192, 0.03);
	}

	.podium-card.rank-3 {
		border-color: rgba(205, 127, 50, 0.2);
		background: rgba(205, 127, 50, 0.03);
	}

	.medal {
		font-size: 1.5rem;
	}

	.podium-avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ff6b9d, #c084fc);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.podium-avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.podium-initial {
		color: white;
		font-size: 1.2rem;
		font-weight: 700;
	}

	.podium-name {
		font-weight: 600;
		color: #f3f4f6;
		font-size: 0.9rem;
	}

	.podium-wins {
		color: #4ade80;
		font-weight: 600;
		font-size: 0.85rem;
	}

	.podium-rate {
		color: #9ca3af;
		font-size: 0.75rem;
	}

	/* ═════════════════════════════════════════════════
	   RANKINGS TABLE
	   ═════════════════════════════════════════════════ */
	.rankings-table {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.table-header,
	.table-row {
		display: grid;
		grid-template-columns: 40px 1fr 65px 55px 60px 60px;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.85rem;
	}

	.table-header {
		color: #6b7280;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding-bottom: 0.75rem;
	}

	.table-row {
		border-radius: 0.4rem;
		background: rgba(255, 255, 255, 0.02);
	}

	.table-row:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.col-rank {
		color: #6b7280;
		font-weight: 600;
	}

	.col-player {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #d1d5db;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.row-avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ff6b9d, #c084fc);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		overflow: hidden;
	}

	.row-avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.row-initial {
		color: white;
		font-size: 0.6rem;
		font-weight: 700;
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
		color: #ff6b9d;
		font-weight: 600;
		text-align: right;
	}

	/* ═════════════════════════════════════════════════
	   RESPONSIVE
	   ═════════════════════════════════════════════════ */
	@media (max-width: 640px) {
		.podium {
			gap: 0.5rem;
		}

		.podium-card {
			padding: 1rem;
			min-width: 90px;
		}

		.table-header,
		.table-row {
			grid-template-columns: 35px 1fr 55px 55px;
		}

		.col-losses,
		.col-rate {
			display: none;
		}
	}
</style>