<script lang="ts">
	import LevelBadge from './progression/LevelBadge.svelte';

	type Badge = {
		id: string;
		name: string;
		icon: string;
		tier: string;
		category: string;
		unlockedAt: string;
	};

	type Progression = {
		level: number;
		currentXp: number;
		xpToNextLevel: number;
	};

	type Props = {
		badges: Badge[];
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
	let recentBadges = $derived(badges.slice(0, maxBadges));
	let remaining = $derived(Math.max(0, badges.length - maxBadges));

	function timeAgo(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const mins = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);
		if (mins < 1) return 'Just now';
		if (mins < 60) return `${mins}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
	}
</script>

<div class="showcase">
	<!-- ═══ MILESTONES ═══ -->
	<div class="milestones">
		<div class="section-header">
			<h2 class="section-title"><span class="bar purple"></span> Milestones</h2>
		</div>

		<div class="milestone-grid">
			<!-- Level -->
			<div class="milestone-card level-card">
				<LevelBadge {level} size="md" />
				<div class="milestone-info">
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
					{#if currentStreak >= 5}
						💫
					{:else if currentStreak >= 3}
						🔥
					{:else if currentStreak >= 1}
						⚡
					{:else}
						❄️
					{/if}
				</div>
				<div class="milestone-info">
					<span class="milestone-value">{currentStreak} win{currentStreak !== 1 ? 's' : ''}</span>
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
			<h2 class="section-title"><span class="bar accent"></span> Recent Badges</h2>
			<a href="/achievements" class="see-all">View all →</a>
		</div>

		{#if recentBadges.length > 0}
			<div class="badge-grid">
				{#each recentBadges as badge (badge.id)}
					<div class="badge-card {badge.tier}" title="{badge.name}">
						<div class="badge-tier-line"></div>
						<span class="badge-icon">{badge.icon}</span>
						<span class="badge-name">{badge.name}</span>
						<span class="badge-time">{timeAgo(badge.unlockedAt)}</span>
						<div class="badge-glow-bg"></div>
					</div>
				{/each}
				{#if remaining > 0}
					<a href="/achievements" class="badge-overflow">
						<span class="overflow-num">+{remaining}</span>
						<span class="overflow-text">more</span>
					</a>
				{/if}
			</div>
		{:else}
			<div class="empty-state">
				<span class="empty-icon">🔒</span>
				<div class="empty-text">
					<p class="empty-title">No badges yet</p>
					<p class="empty-sub">Play games to start earning achievements!</p>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.showcase {
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

	.bar.accent {
		background: #ff6b9d;
	}

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
		font-size: 1.75rem;
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
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 0.5rem;
	}

	.badge-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.85rem 0.5rem 0.65rem;
		border-radius: 0.65rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid transparent;
		text-align: center;
		transition: all 0.25s;
		overflow: hidden;
		cursor: default;
	}

	.badge-card:hover {
		transform: translateY(-2px);
	}

	/* Tier line */
	.badge-tier-line {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		opacity: 0.6;
	}

	/* Glow bg on hover */
	.badge-glow-bg {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		opacity: 0;
		transition: opacity 0.25s;
		pointer-events: none;
	}

	.badge-card:hover .badge-glow-bg {
		opacity: 1;
	}

	/* Tier colors */
	.badge-card.bronze {
		border-color: rgba(205, 127, 50, 0.12);
	}
	.badge-card.bronze:hover {
		border-color: rgba(205, 127, 50, 0.25);
	}
	.badge-card.bronze .badge-tier-line {
		background: linear-gradient(90deg, transparent, #cd7f32, transparent);
	}
	.badge-card.bronze .badge-glow-bg {
		background: radial-gradient(circle, rgba(205, 127, 50, 0.06) 0%, transparent 70%);
	}

	.badge-card.silver {
		border-color: rgba(192, 192, 210, 0.1);
	}
	.badge-card.silver:hover {
		border-color: rgba(192, 192, 210, 0.2);
	}
	.badge-card.silver .badge-tier-line {
		background: linear-gradient(90deg, transparent, #c0c0d2, transparent);
	}
	.badge-card.silver .badge-glow-bg {
		background: radial-gradient(circle, rgba(192, 192, 210, 0.05) 0%, transparent 70%);
	}

	.badge-card.gold {
		border-color: rgba(255, 215, 0, 0.12);
	}
	.badge-card.gold:hover {
		border-color: rgba(255, 215, 0, 0.25);
	}
	.badge-card.gold .badge-tier-line {
		background: linear-gradient(90deg, transparent, #ffd700, transparent);
	}
	.badge-card.gold .badge-glow-bg {
		background: radial-gradient(circle, rgba(255, 215, 0, 0.06) 0%, transparent 70%);
	}

	.badge-card.legendary {
		border-color: rgba(168, 85, 247, 0.15);
	}
	.badge-card.legendary:hover {
		border-color: rgba(168, 85, 247, 0.3);
	}
	.badge-card.legendary .badge-tier-line {
		background: linear-gradient(90deg, transparent, #a855f7, transparent);
	}
	.badge-card.legendary .badge-glow-bg {
		background: radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%);
	}

	.badge-icon {
		font-size: 1.5rem;
		line-height: 1;
		position: relative;
		z-index: 1;
		transition: transform 0.3s;
	}

	.badge-card:hover .badge-icon {
		transform: scale(1.15);
	}

	.badge-name {
		font-size: 0.62rem;
		font-weight: 600;
		color: #d1d5db;
		line-height: 1.25;
		position: relative;
		z-index: 1;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.badge-time {
		font-size: 0.52rem;
		color: #4b5563;
		position: relative;
		z-index: 1;
	}

	/* ── Overflow link ── */
	.badge-overflow {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15rem;
		padding: 0.85rem 0.5rem 0.65rem;
		border-radius: 0.65rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px dashed rgba(255, 255, 255, 0.08);
		text-decoration: none;
		transition: all 0.2s;
	}

	.badge-overflow:hover {
		border-color: rgba(255, 107, 157, 0.2);
		background: rgba(255, 107, 157, 0.03);
	}

	.overflow-num {
		font-size: 1.1rem;
		font-weight: 700;
		color: #5a5a7e;
		transition: color 0.2s;
	}

	.badge-overflow:hover .overflow-num {
		color: #ff6b9d;
	}

	.overflow-text {
		font-size: 0.55rem;
		color: #4b5563;
	}

	/* ── Empty state ── */
	.empty-state {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 1.25rem;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px dashed rgba(255, 255, 255, 0.06);
	}

	.empty-icon {
		font-size: 1.75rem;
		opacity: 0.35;
	}

	.empty-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.empty-title {
		font-size: 0.82rem;
		font-weight: 600;
		color: #6b7280;
		margin: 0;
	}

	.empty-sub {
		font-size: 0.72rem;
		color: #4b5563;
		margin: 0;
	}

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