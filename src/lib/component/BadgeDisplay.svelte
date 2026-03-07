<script lang="ts">
	import LevelBadge from './progression/LevelBadge.svelte';
	import type { Achievement, Progression } from '$lib/types/progression';
	import { formatDate } from '$lib/utils/format_date';
	import AchievementCard from './progression/AchievementCard.svelte';
	import { getStreakInfo, getMilestone } from '$lib/utils/format_progression';
	import AchievementDetailModal from './progression/AchievementDetailModal.svelte';

	type Props = {
		badges: Achievement[];
		progression?: Progression | null;
		currentStreak: number;
		bestStreak: number;
		totalGames: number;
		wins: number;
		maxBadges?: number;
	};

	let {
		badges,
		progression = null,
		currentStreak,
		bestStreak,
		totalGames,
		wins,
		maxBadges = 8,
	}: Props = $props();

	let level = $derived(progression?.level ?? 1);
	let streak = $derived(getStreakInfo(currentStreak));
	let selectedAchievement = $state<Achievement | null>(null);
	let milestone = $derived(getMilestone(level));

	// If more than 8 badges, show 7 + overflow card = 8 slots
	// If fewer, show earned + ghost slots = 8 slots
	let hasOverflow = $derived(badges.length > maxBadges);
	let displayCount = $derived(hasOverflow ? maxBadges - 1 : badges.length);
	let recentBadges = $derived(badges.slice(0, displayCount));
	let remaining = $derived(Math.max(0, badges.length - displayCount));
	let emptySlots = $derived(maxBadges - displayCount - (hasOverflow ? 1 : 0));
</script>

<div class="showcase">
	<!-- ═══ MILESTONES ═══ -->
	<div class="milestones">
		<!-- <div class="section-header">
			<h2 class="section-title"><span class="bar purple"></span> Milestones</h2>
		</div> -->

		<div class="milestone-grid">
			<!-- Level -->
			<div class="milestone-card level-card">
				<LevelBadge {level} size="md" />
				<div class="milestone-info">
					<span class="milestone-value">{milestone.title}</span>
					<span class="milestone-value">Level {level}</span>
					{#if progression}
						<span class="milestone-sub">
							{progression.currentXp.toLocaleString()} / {progression.xpToNextLevel.toLocaleString()} XP
						</span>
					{:else}
						<span class="milestone-sub">0 XP earned</span>
					{/if}
				</div>
			</div>

			<!-- Current Streak -->
			<div class="milestone-card streak-card" class:on-fire={currentStreak >= 3}>
				<div class="milestone-icon">
					{streak.emoji}
				</div>
				<div class="milestone-info">
					<span class="milestone-value">{streak.label}</span>
					<span class="milestone-sub">Current streak</span>
				</div>
				{#if currentStreak >= 3}
					<div class="streak-glow"></div>
				{/if}
			</div>

			<!-- Best Streak -->
			<div class="milestone-card best-card">
				<div class="milestone-icon">🏆</div>
				<div class="milestone-info">
					<span class="milestone-value">{bestStreak} win{bestStreak !== 1 ? 's' : ''}</span>
					<span class="milestone-sub">Best streak</span>
				</div>
			</div>
		</div>
	</div>

	<!-- ═══ RECENT BADGES ═══ -->
	<div class="recent-badges">
		<div class="section-header">
			<h2 class="section-title"><span class="bar purple"></span> Recent Badges</h2>
			<a href="/achievements" class="see-all">{badges.length} earned · View all →</a>
		</div>

		<div class="badge-grid">
			<!-- Earned badges -->
			{#each recentBadges as badge (badge.id)}
				<AchievementCard
					id={badge.id}
					name={badge.name}
					description={badge.description}
					tier={badge.tier}
					category={badge.category}
					icon={badge.icon}
					unlockedAt={badge.unlockedAt}
					onclick={() => selectedAchievement = badge}
					size="md"
				/>
			{/each}

			<!-- Modal -->
			{#if selectedAchievement}
				<AchievementDetailModal
					achievement={selectedAchievement}
					onclose={() => selectedAchievement = null}
				/>
			{/if}

			<!-- Overflow (+N) replaces last ghost slot if needed -->
			{#if remaining > 0}
				<a href="/achievements" class="badge-card ghost overflow-link">
					<span class="overflow-num">+{remaining}</span>
					<span class="overflow-text">more</span>
				</a>
			{/if}

			<!-- Empty ghost slots -->
			{#each Array(emptySlots) as _, i}
				<div class="badge-card ghost">
					<span class="ghost-icon">🔒</span>
					<span class="ghost-label">???</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.showcase {
		background: rgba(30, 27, 36, 0.244);
		border-radius: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* ── Section Header ── */
	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.section-title {
		font-size: 1rem;
		font-weight: 600;
		color: #d1d5db;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.bar {
		display: inline-block;
		width: 3px;
		height: 16px;
		border-radius: 2px;
	}

	.bar.purple {
		background: #a855f7;
	}

	/* .bar.accent {
		background: #ff6b9d;
	} */

	.see-all {
		font-size: 0.72rem;
		color: #5a5a7e;
		text-decoration: none;
		transition: color 0.15s;
	}

	.see-all:hover {
		color: #ff6b9d;
	}

	/* ═══════════════════════════════════ */
	/*  MILESTONES                         */
	/* ═══════════════════════════════════ */
	.milestone-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	.milestone-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.1rem;
		border-radius: 0.85rem;
		background: linear-gradient(135deg, rgba(22, 22, 58, 0.8), rgba(16, 16, 42, 0.9));
		border: 1px solid rgba(255, 255, 255, 0.06);
		position: relative;
		overflow: hidden;
		transition: all 0.25s;
	}

	.milestone-card:hover {
		border-color: rgba(255, 255, 255, 0.1);
		transform: translateY(-2px);
	}

	.milestone-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		opacity: 0.5;
	}

	.level-card::before {
		background: linear-gradient(90deg, transparent, #a855f7, transparent);
	}

	.streak-card::before {
		background: linear-gradient(90deg, transparent, #fbbf24, transparent);
	}

	.best-card::before {
		background: linear-gradient(90deg, transparent, #ffd700, transparent);
	}

	.milestone-icon {
		font-size: 1.85rem;
		flex-shrink: 0;
		line-height: 1;
	}

	.milestone-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.milestone-value {
		font-size: 0.88rem;
		font-weight: 700;
		color: #fff;
	}

	.milestone-sub {
		font-size: 0.68rem;
		color: #5a5a7e;
	}

	/* On fire streak glow */
	.streak-card.on-fire {
		border-color: rgba(251, 191, 36, 0.15);
	}

	.streak-card.on-fire .milestone-value {
		color: #fbbf24;
	}

	.streak-glow {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at 30% 50%, rgba(251, 191, 36, 0.06) 0%, transparent 70%);
		pointer-events: none;
	}

	/* ═══════════════════════════════════ */
	/*  RECENT BADGES                      */
	/* ═══════════════════════════════════ */
	.badge-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
	}

	.badge-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 0.65rem 1.75rem;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid transparent;
		text-align: center;
		transition: all 0.25s;
		overflow: hidden;
		cursor: pointer;
		width: 100%;
		font-family: inherit;
		color: inherit;
	}

	.badge-card:hover:not(.ghost) {
		transform: translateY(-2px);
	}

	/* ── Ghost / empty slots ── */
	.badge-card.ghost {
		background: rgba(255, 255, 255, 0.01);
		border: 1px dashed rgba(255, 255, 255, 0.06);
		min-height: 140px;           /* match AchievementCard's natural height */
		justify-content: center;     /* center the lock icon vertically */
	}

	.ghost-icon {
		font-size: 1.75rem;
		opacity: 0.15;
		filter: grayscale(1);
		line-height: 1;
	}

	.ghost-label {
		font-size: 0.58rem;
		color: #2a2a4a;
		font-weight: 500;
		letter-spacing: 0.05em;
	}

	/* ── Overflow link (styled as ghost) ── */
	.badge-card.overflow-link {
		text-decoration: none;
		cursor: pointer;
		border: 1px dashed rgba(255, 255, 255, 0.08);
	}

	.badge-card.overflow-link:hover {
		border-color: rgba(255, 107, 157, 0.2);
		background: rgba(255, 107, 157, 0.03);
		transform: translateY(-2px);
	}

	.overflow-num {
		font-size: 1.1rem;
		font-weight: 700;
		color: #5a5a7e;
		line-height: 1;
		transition: color 0.2s;
	}

	.badge-card.overflow-link:hover .overflow-num {
		color: #ff6b9d;
	}

	.overflow-text {
		font-size: 0.52rem;
		color: #3a3a5e;
	}

	/* .badge-time {
		font-size: 0.52rem;
		color: #4b5563;
		position: relative;
		z-index: 1;
	} */

	/* ── Responsive ── */
	@media (max-width: 640px) {
		.milestone-grid {
			grid-template-columns: 1fr;
		}

		.badge-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}
</style>