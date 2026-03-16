<script lang="ts">
	import ProfileBanner from '$lib/component/ProfileBanner.svelte';
	import BadgeDisplay from '$lib/component/BadgeDisplay.svelte';
	import { formatDate, formatDuration } from '$lib/utils/format_date';
	import { speedEmoji, formatMode } from '$lib/utils/format_game';
	import type { FriendshipStatus } from '$lib/types/progression';
	import type { PageData } from './$types';
	import HeadtoHead from '$lib/component/HeadtoHead.svelte';
	import { goto } from '$app/navigation';
	import { getSocket } from '$lib/stores/socket.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { setWaiting } from '$lib/stores/matchmaking.svelte';
	import ChallengePicker from '$lib/component/ChallengePicker.svelte';
	import Starfield from '$lib/component/Starfield.svelte';
	import NoiseGrain from '$lib/component/NoiseGrain.svelte';

	let { data }: { data: PageData } = $props();
	let showH2hModal = $state(false);
	let showChallengePicker = $state(false);

	const RING_C = 125.66;
	let ringOffset = $derived(RING_C * (1 - data.stats.winRate / 100));

	async function handleAddFriend() {
		const res = await fetch('/api/friends/request', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ friendId: data.friend.id }),
		});
		if (res.ok) {
			window.location.reload();
		}
	}

	function handleChallenge() {
		showChallengePicker = true;
	}

	function sendChallenge(settings: { speedPreset: string; winScore: number }) {
		const socket = getSocket();
		if (!socket?.connected) {
			toast.error('Not connected to server');
			return;
		}
		socket.emit('game:invite', {
			friendId: data.friend.id,
			settings,
		});

		setWaiting({
			you: { username: data.user.username, avatarUrl: data.user.avatarUrl, displayName: data.user.name },
			opponent: { username: data.friend.username, avatarUrl: data.friend.avatarUrl, displayName: data.friend.name },
			settings: { speedPreset: settings.speedPreset as 'chill' | 'normal' | 'fast', winScore: settings.winScore, mode: 'online' },
			totalTime: 30,
		});
		showChallengePicker = false;
		goto('/play/online/waiting');
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

<Starfield starCount={30}/>
<!-- <NoiseGrain opacity={0.03} /> -->

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
		onchallenge={handleChallenge}
	/>

	<!-- Head-to-Head -->
	{#if data.headToHead.total > 0}
		<section class="h2h-section">
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="h2h-card" onclick={() => showH2hModal = true}>
				<div class="h2h-header">
					<h2 class="section-title">Head to Head</h2>
					<span class="h2h-badge">{data.headToHead.total} games</span>
				</div>
				<div class="h2h-versus">
					<div class="h2h-player you">
						<div class="h2h-avatar you-av">🎮</div>
						<span class="h2h-name">You</span>
					</div>

					<div class="h2h-score-area">
						<span class="h2h-wins you-wins">{data.headToHead.yourWins}</span>
						<div class="h2h-divider">
							<div class="h2h-dash"></div>
							<span class="h2h-vs">vs</span>
							<div class="h2h-dash"></div>
						</div>
						<span class="h2h-wins them-wins">{data.headToHead.theirWins}</span>
					</div>

					<div class="h2h-player them">
						<div class="h2h-avatar them-av">🚀</div>
						<span class="h2h-name">{data.friend.name}</span>
					</div>
				</div>
			</div>
		</section>

		<HeadtoHead
			open={showH2hModal}
			you={{ username: data.user?.username ?? '', name: data.user?.name ?? 'You', avatarUrl: data.user?.avatarUrl ?? null }}
			them={{ username: data.friend.username, name: data.friend.name, avatarUrl: data.friend.avatarUrl }}
			yourWins={data.headToHead.yourWins}
			theirWins={data.headToHead.theirWins}
			total={data.headToHead.total}
			avgScore={data.headToHead.avgScore}
			bestWin={data.headToHead.bestWin}
			lastPlayed={data.headToHead.lastPlayed}
			recentMatches={data.headToHead.recentMatches}
			onChallenge={handleChallenge}
			onclose={() => showH2hModal = false}
		/>
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

{#if showChallengePicker}
	<ChallengePicker
		targetName={{ username: data.friend.username, displayName: data.friend.name, avatarUrl: data.friend.avatarUrl }}
		onSend={sendChallenge}
		onCancel={() => showChallengePicker = false}
	/>
{/if}

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
		background: linear-gradient(135deg, rgba(22, 22, 58, 0.8), rgba(16, 16, 42, 0.9));
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.85rem;
		padding: 1.25rem 1.5rem;
		gap: 1.5rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.h2h-card:hover {
		border-color: rgba(255, 107, 157, 0.2);
		transform: translateY(-1px);
	}

	.h2h-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.h2h-header .section-title {
		margin: 0;
	}

	.h2h-badge {
		font-size: 0.75rem;
		color: #7a7a9e;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		padding: 0.2rem 0.6rem;
		font-weight: 500;
	}

	.h2h-versus {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12rem;
		padding: 1.25rem 1.5rem;
	}

	.h2h-player {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 80px;
		gap: 0.85rem;
	}

	.h2h-avatar {
		width: 86px;
		height: 86px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.5rem;
		border: 2px solid rgba(255, 255, 255, 0.08);
	}

	.you-av {
		background: linear-gradient(135deg, rgba(255, 107, 157, 0.15), rgba(255, 107, 157, 0.05));
		border-color: rgba(255, 107, 157, 0.2);
	}

	.them-av {
		background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.05));
		border-color: rgba(168, 85, 247, 0.2);
	}

	.h2h-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: #fff;
	}

	.h2h-score-area {
		display: flex;
		align-items: center;
		gap: 2.75rem;
	}

	.h2h-wins {
		font-size: 2.5rem;
		font-weight: 800;
		line-height: 1;
	}

	.you-wins {
		color: #ff6b9d;
	}

	.them-wins {
		color: #a855f7;
	}

	.h2h-divider {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
	}

	.h2h-vs {
		font-size: 0.85rem;
		color: #3b3b5e;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.h2h-dash {
		width: 20px;
		height: 2px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 1px;
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