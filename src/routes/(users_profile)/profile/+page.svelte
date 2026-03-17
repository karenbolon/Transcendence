<script lang="ts">
	import EditProfileModal from "$lib/component/EditProfileModal.svelte";
	import ProfileBanner from "$lib/component/ProfileBanner.svelte";
	import { formatDate, formatDuration } from "$lib/utils/format_date";
	import { speedEmoji, formatMode } from "$lib/utils/format_game";
	import { _ } from 'svelte-i18n';
	import type { PageData } from "./$types";
	import BadgeDisplay from "$lib/component/BadgeDisplay.svelte";
	import type { ProfileEditData } from "$lib/types/utils";

	let { data }: { data: PageData } = $props();

	let showEditModal = $state(false);

	// Local override for edited profile data
	let editOverride = $state<ProfileEditData | null>(null);

	let userName = $derived(editOverride?.name ?? data.user.name);
	let userBio = $derived(editOverride?.bio ?? data.user.bio);
	let userAvatarUrl = $derived(editOverride?.avatarUrl ?? data.user.avatarUrl);

	function handleEditSave(updated: { name: string; bio: string | null; avatarUrl: string | null }) {
		editOverride = updated;
	}

	// SVG ring: circumference = 2 * PI * 20 ≈ 125.66
	const RING_C = 125.66;
	let ringOffset = $derived(RING_C * (1 - data.stats.winRate / 100));
</script>

<div class="profile-page max-w-4xl mx-auto px-4 py-8">
	<ProfileBanner
		username={data.user.username}
		displayName={userName}
		avatarUrl={userAvatarUrl}
		email={data.user.email}
		bio={userBio}
		isOnline={data.user.isOnline}
		createdAt={data.user.createdAt}
		variant="own"
		progression={data.progression}
		oneditprofile={() => showEditModal = true}
	/>

	<EditProfileModal
		open={showEditModal}
		user={{ name: userName, bio: userBio, avatarUrl: userAvatarUrl }}
		onclose={() => showEditModal = false}
		onsave={handleEditSave}
	/>

	<!-- ═══════════════════════════════════════════════════════════
	     STATS CARDS
	═══════════════════════════════════════════════════════════ -->
	<section class="stats-grid">
		<div class="stat-card total">
			<span class="stat-value">{data.stats.totalGames}</span>
			<span class="stat-label">{$_('common.games')}</span>
		</div>
		<div class="stat-card wins">
			<span class="stat-value">{data.stats.wins}</span>
			<span class="stat-label">{$_('user_profile.dashboard.wins')}</span>
		</div>
		<div class="stat-card losses">
			<span class="stat-value">{data.stats.losses}</span>
			<span class="stat-label">{$_('user_profile.dashboard.losses')}</span>
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
			<!-- <span class="stat-value rate">{data.stats.winRate}%</span> -->
			<span class="stat-label">{$_('user_profile.dashboard.winRate')}</span>
		</div>
		<!-- <div class="stat-card">
			<span class="stat-value best">{data.stats.bestScore}</span>
			<span class="stat-label">Best Score</span>
		</div> -->
	</section>

	<!-- ═══════════════════════════════════════════════════════════
	     PROGRESSION and ACHIEVEMENTS
	═══════════════════════════════════════════════════════════ -->
	<!-- Achievements -->
	<section class="user-achievements">
		<div class="section-header">
			<h2 class="section-title">{$_('user_profile.dashboard.milestonesTitle')}</h2>
			<!-- <a href="/achievements" class="view-all-link">View all →</a> -->
		</div>
			{#if data.achievements && data.achievements.length > 0}
				<BadgeDisplay badges={data.achievements ?? []}
					progression={data.progression}
					currentStreak={data.stats.currentStreak}
					bestStreak={data.stats.bestStreak}
					totalGames={data.stats.totalGames}
					wins={data.stats.wins}
				/>
			{:else}
				<p class="empty-achievements">
					{$_('user_profile.dashboard.noAchievements')}
				</p>
			{/if}
	</section>

	<!-- ═══════════════════════════════════════════════════════════
	     MATCH HISTORY
	═══════════════════════════════════════════════════════════ -->
	<section class="match-history">
    <h2 class="section-title">{$_('user_profile.dashboard.matchHistoryTitle')}</h2>
		{#if data.matches.length > 0}
			<a href="/match-history" class="view-all-link">View all</a>
		{/if}
		

		{#if data.matches.length === 0}
			<div class="empty-state">
				<h3>{$_('user_profile.dashboard.noMatchesTitle')}</h3>
				<p>{$_('user_profile.dashboard.noMatchesText')}</p>
				<a href="/play" class="play-link"
					>🎮 {$_('user_profile.dashboard.playFirstGame')} →</a
				>
			</div>
		{:else}
			<div class="matches-list">
				{#each data.matches as match}
					<div
						class="match-row"
						class:won={match.won}
						class:lost={!match.won}
					>
						<!-- Result indicator -->
						<span class="match-result">
							{match.won ? "W" : "L"}
						</span>

						<!-- Score -->
						<span class="match-score">
							<span class="user-score">{match.userScore}</span>
							<span class="score-divider">–</span>
							<span class="opponent-score"
								>{match.opponentScore}</span
							>
						</span>

						<!-- Opponent -->
						<span class="match-opponent">{match.opponentName}</span>

						<!-- Mode + Speed -->
						<span class="match-mode"
							>{$_(formatMode(match.gameMode), { default: match.gameMode })}</span
						>
						<span class="match-speed"
							>{speedEmoji(match.speedPreset)}</span
						>

						<!-- Duration -->
						<span class="match-duration"
							>{formatDuration(match.durationSeconds)}</span
						>

						<!-- When -->
						<span class="match-time"
							>{formatDate(match.playedAt)}</span
						>
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

	/* ═════════════════════════════════════════════════
	   STATS GRID
	   ═════════════════════════════════════════════════ */
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
		/* background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		padding: 1rem;
		gap: 0.25rem; */
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
	/* .stat-card.rate .stat-value  { color: #ff6b9d; } */


	.stat-label {
		font-size: 0.75rem;
		color: #7a7a9e;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 500;
	}

	/* Ring */
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

	/* ═════════════════════════════════════════════════
	   MATCH HISTORY
	   ═════════════════════════════════════════════════ */
	.section-header {
		display: flex;
		align-items: center;
		margin-bottom: 0.75rem;
	}
	.section-title {
		font-size: 1.1rem;
		font-weight: 900;
		color: #d1d5db;
		/* margin: 0 0 0.75rem 0; */
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

	.empty-state {
		text-align: center;
		padding: 2rem;
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

	.match-row:nth-child(even) {
		background: rgba(255, 255, 255, 0.02);
	}

	.match-row:nth-child(odd) {
		background: rgba(255, 255, 255, 0.05);
	}

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

	.match-score {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-weight: 600;
	}

	.user-score {
		color: #f3f4f6;
	}

	.score-divider {
		color: #4b5563;
	}

	.opponent-score {
		color: #9ca3af;
	}

	.match-opponent {
		color: #d1d5db;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.match-mode {
		color: #6b7280;
		font-size: 0.75rem;
	}

	.match-speed {
		text-align: center;
	}

	.match-duration {
		color: #6b7280;
		font-size: 0.8rem;
		text-align: right;
	}

	.match-time {
		color: #4b5563;
		font-size: 0.75rem;
		text-align: right;
	}

	/* ═════════════════════════════════════════════════
	   RESPONSIVE
	   ═════════════════════════════════════════════════ */
	@media (max-width: 640px) {

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

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

	.view-all-link {
		font-size: 0.8rem;
		color: #ff6b9d;
		text-decoration: none;
		font-weight: 500;
		transition: color 0.15s;
	}

	.view-all-link:hover {
		color: #ff8db5;
		text-decoration: underline;
	}

	/* ═════════════════════════════════════════════════
	   ACHIEVEMENTS SECTION
	   ═════════════════════════════════════════════════ */
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.section-header .section-title {
		margin: 0;
	}

	.empty-achievements {
		color: #6b7280;
		font-size: 0.85rem;
		text-align: center;
		padding: 1rem;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes scaleIn {
		from {
			transform: scale(0.95);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>
