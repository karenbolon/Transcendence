<script lang="ts">
    import type { PageData } from "./$types";
    import AchievementCard from "$lib/component/progression/AchievementCard.svelte";
    import XpBar from "$lib/component/progression/XpBar.svelte";
    import LevelBadge from "$lib/component/progression/LevelBadge.svelte";

    let { data }: { data: PageData } = $props();

    let selectedCategory = $state<string | null>(null);

    let filteredAchievements = $derived(
        selectedCategory
            ? data.achievements.filter((a) => a.category === selectedCategory)
            : data.achievements,
    );

    const categoryLabels: Record<string, string> = {
        origins: "🌀 Origins",
        progression: "📈 Advancement",
        shutout: "🛡️ Shutout",
        streak: "🔥 Streaks",
        scorer: "🎯 Scorer",
        veteran: "🎮 Veteran",
        comeback: "💪 Comeback",
        rally: "🏓 Rally",
    };

    let completionPercent = $derived(
        data.totalCount > 0
            ? Math.round((data.unlockedCount / data.totalCount) * 100)
            : 0,
    );
</script>

<div class="achievements-page">
    <!-- Header -->
    <header class="page-header">
        <div class="header-top">
            <h1 class="page-title">Achievements</h1>
            {#if data.progression}
                <LevelBadge level={data.progression.level} />
            {/if}
        </div>

        <!-- Completion bar -->
        <div class="completion-section">
            <div class="completion-header">
                <span class="completion-label"
                    >{data.unlockedCount} / {data.totalCount} unlocked</span
                >
                <span class="completion-percent">{completionPercent}%</span>
            </div>
            <div class="completion-track">
                <div
                    class="completion-fill"
                    style="width: {completionPercent}%"
                ></div>
            </div>
        </div>

        {#if data.progression}
            <XpBar
                currentXp={data.progression.currentXp}
                xpToNextLevel={data.progression.xpToNextLevel}
                level={data.progression.level}
            />
        {/if}
    </header>

    <!-- Category Filter -->
    <nav class="category-nav">
        <button
            class="category-btn"
            class:active={selectedCategory === null}
            onclick={() => (selectedCategory = null)}
        >
            All
        </button>
        {#each data.categories as cat}
            <button
                class="category-btn"
                class:active={selectedCategory === cat}
                onclick={() => (selectedCategory = cat)}
            >
                {categoryLabels[cat] ?? cat}
            </button>
        {/each}
    </nav>

    <!-- Achievement Grid -->
    <div class="achievement-list">
        {#each filteredAchievements as ach (ach.id)}
            <AchievementCard
                id={ach.id}
                name={ach.name}
                description={ach.description}
                tier={ach.tier}
                icon={ach.icon}
                unlockedAt={ach.unlockedAt}
            />
        {/each}
    </div>

    {#if filteredAchievements.length === 0}
        <p class="empty-state">No achievements in this category yet.</p>
    {/if}

    <a href="/profile" class="back-link">← Back to Profile</a>
</div>

<style>
    .achievements-page {
        max-width: 600px;
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

    /* Achievement List */
    .achievement-list {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
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
