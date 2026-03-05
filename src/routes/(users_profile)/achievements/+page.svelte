<script lang="ts">
	import type { PageData } from './$types';
	import AchievementCard from '$lib/component/progression/AchievementCard.svelte';
	import AchievementDetailModal from '$lib/component/progression/AchievementDetailModal.svelte';
	import XpBar from '$lib/component/progression/XpBar.svelte';
	import LevelBadge from '$lib/component/progression/LevelBadge.svelte';
	import { CATEGORYLABELS, DEFAULT_PROGRESSION } from '$lib/utils/format_progression';

	let { data }: { data: PageData } = $props();

	let progression = $derived(data.progression ?? DEFAULT_PROGRESSION);

	let selectedCategory = $state<string | null>(null);
	let selectedAchievement = $state<(typeof data.achievements)[number] | null>(
		null,
	);

	let filteredAchievements = $derived(
		selectedCategory
			? data.achievements.filter((a) => a.category === selectedCategory)
			: data.achievements,
	);

	let completionPercent = $derived(
		data.totalCount > 0
			? Math.round((data.unlockedCount / data.totalCount) * 100)
			: 0,
	);

	function openDetail(achievement: (typeof data.achievements)[number]) {
		selectedAchievement = achievement;
	}

	function closeDetail() {
		selectedAchievement = null;
	}
</script>

<div class="achievements-page">
	<!-- Header -->
	<section class="page-header">
		<div class="header-top">
			<h1 class="page-title">Achievements</h1>
			<!-- {#if data.progression}
				<LevelBadge level={data.progression.level ?? 1} />
			{/if} -->
			<LevelBadge level={data.progression?.level ?? 1} />
		</div>

		<!-- Completion bar -->
		<div class="completion-section">
			<div class="completion-header">
				<span class="completion-label">
					{data.unlockedCount} / {data.totalCount} unlocked
				</span>
				<span class="completion-percent">{completionPercent}%</span>
			</div>
			<div class="completion-track">
				<div
					class="completion-fill"
					style="width: {completionPercent}%"
				></div>
			</div>
		</div>

		{#if progression}
			<XpBar
				currentXp={progression.currentXp}
				xpToNextLevel={progression.xpToNextLevel}
				level={progression.level}
			/>
		{/if}
	</section>

	<!-- Category Filter -->
	<nav class="category-nav">
		<button
			class="category-btn"
			class:active={selectedCategory === null}
			onclick={() => (selectedCategory = null)}
		>
			All
		</button>
			<button
				class="category-btn"
				class:active={selectedCategory === cat}
				onclick={() => (selectedCategory = cat)}
			</button>
		{/each}
	</nav>

	<!-- Hint -->
	<p class="hint">Tap any achievement for details</p>

	<!-- Achievement Grid -->
	<div class="achievement-list">
		{#each filteredAchievements as ach (ach.id)}
			<AchievementCard
				id={ach.id}
				name={ach.name}
				description={ach.description}
				tier={ach.tier}
				category={ach.category}
				icon={ach.icon}
				unlockedAt={ach.unlockedAt}
				onclick={() => openDetail(ach)}
			/>
		{/each}
	</div>

	{#if filteredAchievements.length === 0}
		<p class="empty-state">No achievements in this category yet.</p>
	{/if}

	<a href="/profile" class="back-link">← Back to Profile</a>
</div>

<!-- Detail Modal -->
<AchievementDetailModal
	achievement={selectedAchievement}
	onclose={closeDetail}
/>

<style>
	.achievements-page {
		max-width: 1200px;
		width: 100%;
		margin: 0 auto;
		padding: 1.5rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.page-header {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin: 2rem;
	}

	.header-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #f3f4f6;
		margin: 0;
	}

	/* Completion */
	.completion-section {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.completion-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.completion-label {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.completion-percent {
		font-size: 0.75rem;
		font-weight: 600;
		color: #ff6b9d;
	}

	.completion-track {
		width: 100%;
		height: 6px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 3px;
		overflow: hidden;
	}

	.completion-fill {
		height: 100%;
		background: linear-gradient(90deg, #4ade80, #22d3ee);
		border-radius: 3px;
		transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Category Nav */
	.category-nav {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.category-btn {
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		color: #9ca3af;
		font-family: inherit;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.category-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #d1d5db;
	}

	.category-btn.active {
		background: rgba(255, 107, 157, 0.1);
		border-color: rgba(255, 107, 157, 0.3);
		color: #ff6b9d;
	}

	/* Hint */
	.hint {
		font-size: 0.7rem;
		color: #4b5563;
		text-align: center;
		font-style: italic;
	}

	/* Achievement List */
	.achievement-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
		gap: 0.6rem;
	}

	@media (max-width: 480px) {
		.achievement-list {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.empty-state {
		text-align: center;
		color: #6b7280;
		font-size: 0.85rem;
		padding: 2rem;
	}

	.back-link {
		color: #6b7280;
		font-size: 0.8rem;
		text-decoration: none;
		text-align: center;
	}

	.back-link:hover {
		color: #ff6b9d;
	}
</style>