<script lang="ts">
	import ProfileBanner from '$lib/component/ProfileBanner.svelte';
	import BadgeDisplay from '$lib/component/BadgeDisplay.svelte';
	import { formatDate, formatDuration } from '$lib/utils/format_date';
	import { speedEmoji, formatMode } from '$lib/utils/format_game';
	import type { FriendshipStatus } from '$lib/types/progression';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const RING_C = 125.66;
	let ringOffset = $derived(RING_C * (1 - data.stats.winRate / 100));

	async function handleAddFriend() {
			const res = await fetch('/api/friends/request', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ friendId: data.friend.id }),
			});
			if (res.ok) {
					// Reload to update friendship status
					window.location.reload();
			}
	}

	async function handleUnfriend() {
			const res = await fetch('/api/friends/remove', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ friendId: data.friend.id }),
			});
			if (res.ok) {
					window.location.reload();
			}
	}
</script>

<div class="profile-page max-w-4xl mx-auto px-4 py-8">
	<ProfileBanner
			username={data.friend.username}
			displayName={data.friend.name}
			avatarUrl={data.friend.avatarUrl}
			bio={data.friend.bio}
			isOnline={data.friend.isOnline}
			createdAt={data.friend.createdAt}
			variant="friend"
			isFriend={data.isFriend}
			friendshipStatus={data.friendshipStatus as FriendshipStatus}
			progression={data.progression}
			onaddfriend={handleAddFriend}
			onunfriend={handleUnfriend}
	/>

	<!-- Head-to-Head -->
	{#if data.headToHead.total > 0}
			<section class="h2h-section">
					<h2 class="section-title">Head to Head</h2>
					<div class="h2h-card">
							<div class="h2h-side you">
									<span class="h2h-label">You</span>
									<span class="h2h-score">{data.headToHead.yourWins}</span>
							</div>
							<div class="h2h-divider">
									<span class="h2h-total">{data.headToHead.total} games</span>
							</div>
							<div class="h2h-side them">
									<span class="h2h-label">{data.friend.name ?? data.friend.username}</span>
									<span class="h2h-score">{data.headToHead.theirWins}</span>
							</div>
					</div>
			</section>
	{/if}

	<!-- Stats -->
	<section class="stats-grid">
			<div class="stat-card total">
					<span class="stat-value">{data.stats.totalGames}</span>
					<span class="stat-label">Games</span>
			</div>
			<div class="stat-card wins">
					<span class="stat-value">{data.stats.wins}</span>
					<span class="stat-label">Wins</span>
			</div>
			<div class="stat-card losses">
					<span class="stat-value">{data.stats.losses}</span>
					<span class="stat-label">Losses</span>
			</div>
			<div class="stat-card rate">
					<div class="rate-ring">
							<svg viewBox="0 0 44 44">
									<circle class="bg-ring" cx="22" cy="22" r="20" />
									<circle class="fg-ring" cx="22" cy="22" r="20"
											style="stroke-dashoffset: {ringOffset};" />
							</svg>
							<span class="rate-number">{data.stats.winRate}%</span>
					</div>
					<span class="stat-label">Win Rate</span>
			</div>
	</section>

	<!-- Achievements -->
	<section class="user-achievements">
			<div class="section-header">
					<h2 class="section-title">Achievements</h2>
			</div>
			{#if data.achievements && data.achievements.length > 0}
					<BadgeDisplay badges={data.achievements}
							progression={data.progression}
							currentStreak={data.stats.currentStreak}
							bestStreak={data.stats.bestStreak}
							totalGames={data.stats.totalGames}
							wins={data.stats.wins}
							viewAllHref="/friends/{data.friend.id}/achievements"
					/>
			{:else}
					<p class="empty-achievements">No achievements yet.</p>
			{/if}
	</section>

	<!-- Match History -->
	<section class="match-history">
			<h2 class="section-title">Match History</h2>

			{#if data.matches.length === 0}
					<div class="empty-state">
							<p>No matches played yet.</p>
					</div>
			{:else}
					<div class="matches-list">
							{#each data.matches as match}
									<div class="match-row" class:won={match.won} class:lost={!match.won}>
											<span class="match-result">{match.won ? 'W' : 'L'}</span>
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
			{/if}
	</section>
</div>

<style>
	.profile-page {
			width: 100%;
			max-width: 1200px;
			margin: 0 auto;
			display: flex;
			flex-direction: column;
			gap: 2rem;
	}

	/* ── Head to Head ── */
	.h2h-section {
			margin-top: 0;
	}

	.h2h-card {
			display: flex;
			align-items: center;
			background: linear-gradient(135deg, rgba(22, 22, 58, 0.8), rgba(16, 16, 42, 0.9));
			border: 1px solid rgba(255, 255, 255, 0.06);
			border-radius: 0.85rem;
			padding: 1.25rem;
			gap: 1rem;
	}

	.h2h-side {
			flex: 1;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 0.25rem;
	}

	.h2h-label {
			font-size: 0.8rem;
			color: #7a7a9e;
			font-weight: 500;
	}

	.h2h-score {
			font-size: 2rem;
			font-weight: 700;
	}

	.h2h-side.you .h2h-score { color: #4ade80; }
	.h2h-side.them .h2h-score { color: #ff6b9d; }

	.h2h-divider {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 0.25rem;
			padding: 0 1rem;
	}

	.h2h-total {
			font-size: 0.75rem;
			color: #6b7280;
	}

	/* ── Stats Grid (same as profile) ── */
	.stats-grid {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 0.75rem;
	}

	.stat-card {
			background: linear-gradient(135deg, rgba(22, 22, 58, 0.8), rgba(16, 16, 42, 0.9));
			backdrop-filter: blur(12px);
			border: 1px solid rgba(255, 255, 255, 0.06);
			border-radius: 0.85rem;
			padding: 1.1rem;
			text-align: center;
			display: flex;
			flex-direction: column;
			gap: 0.3rem;
			position: relative;
			overflow: hidden;
			transition: all 0.25s;
	}

	.stat-card:hover {
			border-color: rgba(255, 255, 255, 0.1);
			transform: translateY(-2px);
	}

	.stat-card::before {
			content: '';
			position: absolute;
			top: 0; left: 0; right: 0;
			height: 2px;
			opacity: 0.5;
	}

	.stat-card.total::before { background: linear-gradient(90deg, transparent, #60a5fa, transparent); }
	.stat-card.wins::before  { background: linear-gradient(90deg, transparent, #4ade80, transparent); }
	.stat-card.losses::before { background: linear-gradient(90deg, transparent, #f87171, transparent); }
	.stat-card.rate::before  { background: linear-gradient(90deg, transparent, #ff6b9d, transparent); }

	.stat-value { font-size: 1.75rem; font-weight: 700; }
	.stat-card.total .stat-value { color: #60a5fa; }
	.stat-card.wins .stat-value  { color: #4ade80; }
	.stat-card.losses .stat-value { color: #f87171; }

	.stat-label {
			font-size: 0.75rem;
			color: #7a7a9e;
			text-transform: uppercase;
			letter-spacing: 0.08em;
			font-weight: 500;
	}

	.rate-ring { position: relative; width: 48px; height: 48px; margin: 0 auto 0.15rem; }
	.rate-ring svg { transform: rotate(-90deg); width: 48px; height: 48px; }
	.rate-ring .bg-ring { fill: none; stroke: rgba(255, 255, 255, 0.06); stroke-width: 4; }
	.rate-ring .fg-ring {
			fill: none;
			stroke: var(--accent, #ff6b9d);
			stroke-width: 4;
			stroke-linecap: round;
			stroke-dasharray: 125.66;
			filter: drop-shadow(0 0 4px rgba(255, 107, 157, 0.5));
			transition: stroke-dashoffset 1s ease;
	}
	.rate-number {
			position: absolute; inset: 0;
			display: flex; align-items: center; justify-content: center;
			font-size: 0.8rem; font-weight: 700; color: var(--accent, #ff6b9d);
	}

	/* ── Section titles ── */
	.section-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 0.75rem;
	}

	.section-header .section-title { margin: 0; }

	.section-title {
			font-size: 1.1rem;
			font-weight: 900;
			color: #d1d5db;
			margin: 1rem;
			display: flex;
			align-items: center;
			gap: 0.5rem;
	}

	.section-title::before {
			content: '';
			width: 3px;
			height: 16px;
			border-radius: 2px;
			background: var(--accent, #ff6b9d);
	}

	/* ── Match History ── */
	.empty-state { text-align: center; padding: 2rem; color: #6b7280; }
	.empty-achievements { color: #6b7280; font-size: 0.85rem; text-align: center; padding: 1rem; }

	.matches-list { display: flex; flex-direction: column; gap: 0.4rem; }

	.match-row {
			display: grid;
			grid-template-columns: 32px 70px 1fr 100px 32px 60px 70px;
			align-items: center;
			gap: 0.6rem;
			padding: 0.65rem 0.85rem;
			border-radius: 0.6rem;
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
			width: 26px; height: 26px;
			border-radius: 50%;
			display: flex; align-items: center; justify-content: center;
			font-weight: 700;
	}

	.match-row.won .match-result  { background: rgba(74, 222, 128, 0.12); color: #4ade80; }
	.match-row.lost .match-result { background: rgba(248, 113, 113, 0.1); color: #f87171; }

	.match-score { display: flex; align-items: center; gap: 0.3rem; font-weight: 600; }
	.user-score { color: #f3f4f6; }
	.score-divider { color: #4b5563; }
	.opponent-score { color: #9ca3af; }
	.match-opponent { color: #d1d5db; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.match-mode { color: #6b7280; font-size: 0.75rem; }
	.match-speed { text-align: center; }
	.match-duration { color: #6b7280; font-size: 0.8rem; text-align: right; }
	.match-time { color: #4b5563; font-size: 0.75rem; text-align: right; }

	@media (max-width: 640px) {
			.stats-grid { grid-template-columns: repeat(2, 1fr); }
			.match-row { grid-template-columns: 28px 60px 1fr 60px; font-size: 0.8rem; }
			.match-mode, .match-speed, .match-duration { display: none; }
			.h2h-card { flex-direction: column; }
	}
</style>