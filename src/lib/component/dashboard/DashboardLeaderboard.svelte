<script lang="ts">
	import { RANK_MEDALS } from '$lib/utils/format_progression';
	import type { LeaderboardPlayer } from '$lib/types/dashboard';

	let {
		title,
		players,
		viewAllHref,
		variant,
	}: {
		title: string;
		players: LeaderboardPlayer[];
		viewAllHref: string;
		variant: 'global' | 'friends';
	} = $props();
</script>

<div class="lb-card {variant}">
	<div class="lb-header">
		<h2 class="lb-title">{title}</h2>
		<a href={viewAllHref} class="lb-link">View all →</a>
	</div>
	<div class="podium">
		{#each players as player, i}
			<a href="/friends/{player.id}" class="podium-row rank-{i + 1}">
				<span class="rank-medal">
					{RANK_MEDALS[i]}
				</span>
				<div class="podium-avatar rank-{i + 1}">
					{#if player.avatarUrl}
						<img src={player.avatarUrl} alt="" class="podium-avatar-img" />
					{:else}
						{(player.displayName || player.username).charAt(0).toUpperCase()}
					{/if}
				</div>
				<div class="podium-info">
					<div class="podium-name">{player.displayName || player.username}</div>
					<div class="podium-stat">
						{player.totalGames}
						{player.totalGames === 1 ? 'game' : 'games'} · {player.winRate}% win
						rate
					</div>
				</div>
				<span class="podium-wins rank-{i + 1}">{player.wins} W</span>
			</a>
		{:else}
			<div class="empty-mini">
				{variant === 'global'
					? 'No games played yet'
					: 'No friend activity yet'}
			</div>
		{/each}
	</div>
</div>

<style>
	.lb-card {
		background: linear-gradient(
			135deg,
			rgba(22, 22, 58, 0.8),
			rgba(16, 16, 42, 0.9)
		);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 1rem;
		padding: 1.25rem;
		position: relative;
		overflow: hidden;
	}

	.lb-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		opacity: 0.5;
	}

	.lb-card.global::before {
		background: linear-gradient(90deg, transparent, #ffd700, transparent);
	}
	.lb-card.friends::before {
		background: linear-gradient(
			90deg,
			transparent,
			var(--accent, #ff6b9d),
			transparent
		);
	}

	.lb-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.lb-title {
		font-size: 1.05rem;
		font-weight: 600;
		color: #d1d5db;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
	}

	.lb-title::before {
		content: '';
		width: 3px;
		height: 14px;
		border-radius: 2px;
	}

	.lb-card.global .lb-title::before {
		background: #ffd700;
	}
	.lb-card.friends .lb-title::before {
		background: var(--accent, #ff6b9d);
	}

	.lb-link {
		font-size: 0.7rem;
		color: #7a7a9e;
		text-decoration: none;
		transition: color 0.15s;
	}

	.lb-link:hover {
		color: var(--accent, #ff6b9d);
	}

	/* Podium */
	.podium {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.podium-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.75rem;
		border-radius: 0.6rem;
		transition: all 0.2s;
		text-decoration: none;
		border: 1px solid transparent;
	}

	.podium-row:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.podium-row.rank-1 {
		background: rgba(255, 215, 0, 0.04);
		border-color: rgba(255, 215, 0, 0.08);
	}
	.podium-row.rank-2 {
		background: rgba(192, 192, 210, 0.03);
		border-color: rgba(192, 192, 210, 0.06);
	}
	.podium-row.rank-3 {
		background: rgba(205, 127, 50, 0.03);
		border-color: rgba(205, 127, 50, 0.06);
	}

	.rank-medal {
		font-size: 1.7rem;
		width: 24px;
		text-align: center;
		flex-shrink: 0;
	}

	.podium-avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.82rem;
		font-weight: 700;
		flex-shrink: 0;
		color: #fff;
		overflow: hidden;
	}

	.podium-avatar.rank-1 {
		background: linear-gradient(
			135deg,
			rgba(255, 215, 0, 0.2),
			rgba(255, 215, 0, 0.08)
		);
		border: 2px solid rgba(255, 215, 0, 0.25);
	}
	.podium-avatar.rank-2 {
		background: linear-gradient(
			135deg,
			rgba(192, 192, 210, 0.15),
			rgba(192, 192, 210, 0.06)
		);
		border: 2px solid rgba(192, 192, 210, 0.2);
	}
	.podium-avatar.rank-3 {
		background: linear-gradient(
			135deg,
			rgba(205, 127, 50, 0.15),
			rgba(205, 127, 50, 0.06)
		);
		border: 2px solid rgba(205, 127, 50, 0.2);
	}

	.podium-avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 50%;
	}

	.podium-info {
		flex: 1;
		min-width: 0;
	}
	.podium-name {
		font-size: 0.92rem;
		font-weight: 600;
		color: #fff;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.podium-stat {
		font-size: 0.68rem;
		color: #7a7a9e;
	}

	.podium-wins {
		font-size: 0.75rem;
		font-weight: 700;
		flex-shrink: 0;
		padding: 0.15rem 0.5rem;
		border-radius: 1rem;
	}

	.podium-wins.rank-1 {
		color: #ffd700;
		background: rgba(255, 215, 0, 0.1);
	}
	.podium-wins.rank-2 {
		color: #c0c0d2;
		background: rgba(192, 192, 210, 0.08);
	}
	.podium-wins.rank-3 {
		color: #cd7f32;
		background: rgba(205, 127, 50, 0.08);
	}

	.empty-mini {
		text-align: center;
		padding: 1.5rem;
		color: #5a5a7e;
		font-size: 0.78rem;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 0.5rem;
		border: 1px dashed rgba(255, 255, 255, 0.06);
	}
</style>
