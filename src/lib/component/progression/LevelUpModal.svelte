<script lang="ts">
    import { onMount } from "svelte";

    type Props = {
        xpEarned: number;
        bonuses: { name: string; amount: number }[];
        oldLevel: number;
        newLevel: number;
        newAchievements: {
            id: string;
            name: string;
            description: string;
            tier: string;
        }[];
        onClose: () => void;
    };

    let {
        xpEarned,
        bonuses,
        oldLevel,
        newLevel,
        newAchievements,
        onClose,
    }: Props = $props();

    let isVisible = $state(false);
    let didLevelUp = $derived(newLevel > oldLevel);

    const tierEmojis: Record<string, string> = {
        bronze: "🥉",
        silver: "🥈",
        gold: "🥇",
    };

    const MILESTONES: { minLevel: number; icon: string }[] = [
        { minLevel: 50, icon: "👑" },
        { minLevel: 30, icon: "🦄" },
        { minLevel: 20, icon: "💎" },
        { minLevel: 10, icon: "🔥" },
        { minLevel: 5, icon: "⚡" },
        { minLevel: 0, icon: "🌱" },
    ];

    let newMilestoneIcon = $derived(
        MILESTONES.find((m) => newLevel >= m.minLevel)?.icon ?? "🌱",
    );

    onMount(() => {
        // Trigger entrance animation
        requestAnimationFrame(() => {
            isVisible = true;
        });
    });

    function handleClose() {
        isVisible = false;
        setTimeout(onClose, 200);
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape" || e.key === " ") {
            e.preventDefault();
            handleClose();
        }
    }
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" class:visible={isVisible} onclick={handleClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="modal"
        class:visible={isVisible}
        onclick={(e) => e.stopPropagation()}
    >
        {#if didLevelUp}
            <div class="level-up-header">
                <span class="level-up-icon">{newMilestoneIcon}</span>
                <h2 class="level-up-title">Level Up!</h2>
                <div class="level-transition">
                    <span class="old-level">Lv.{oldLevel}</span>
                    <span class="arrow">→</span>
                    <span class="new-level">Lv.{newLevel}</span>
                </div>
            </div>
        {:else}
            <h2 class="xp-title">Match Complete</h2>
        {/if}

        <!-- XP Breakdown -->
        <div class="xp-breakdown">
            {#each bonuses as bonus}
                <div class="xp-row">
                    <span class="xp-name">{bonus.name}</span>
                    <span class="xp-amount">+{bonus.amount} XP</span>
                </div>
            {/each}
            <div class="xp-total">
                <span>Total</span>
                <span class="xp-total-amount">+{xpEarned} XP</span>
            </div>
        </div>

        <!-- New Achievements -->
        {#if newAchievements.length > 0}
            <div class="achievements-section">
                <h3 class="achievements-title">🏆 New Achievements</h3>
                {#each newAchievements as ach}
                    <div class="achievement-row">
                        <span class="achievement-tier"
                            >{tierEmojis[ach.tier] ?? "🏅"}</span
                        >
                        <div class="achievement-info">
                            <span class="achievement-name">{ach.name}</span>
                            <span class="achievement-desc"
                                >{ach.description}</span
                            >
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

        <button class="close-btn" onclick={handleClose}>Continue</button>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        transition: background 0.2s ease;
    }

    .modal-backdrop.visible {
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(4px);
    }

    .modal {
        background: #1a1a2e;
        border: 1px solid rgba(255, 107, 157, 0.2);
        border-radius: 1.25rem;
        padding: 2rem;
        max-width: 380px;
        width: 90%;
        transform: scale(0.9);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .modal.visible {
        transform: scale(1);
        opacity: 1;
    }

    /* Level Up Header */
    .level-up-header {
        text-align: center;
        margin-bottom: 1.25rem;
    }

    .level-up-icon {
        font-size: 3rem;
        display: block;
        margin-bottom: 0.5rem;
        animation: bounce 0.6s ease;
    }

    .level-up-title {
        font-size: 1.5rem;
        font-weight: 800;
        color: #ff6b9d;
        margin: 0 0 0.5rem;
        text-shadow: 0 0 20px rgba(255, 107, 157, 0.4);
    }

    .level-transition {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        font-size: 1.1rem;
    }

    .old-level {
        color: #6b7280;
    }

    .arrow {
        color: #ff6b9d;
    }

    .new-level {
        color: #f3f4f6;
        font-weight: 700;
    }

    .xp-title {
        font-size: 1.2rem;
        font-weight: 700;
        color: #d1d5db;
        margin: 0 0 1rem;
        text-align: center;
    }

    /* XP Breakdown */
    .xp-breakdown {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-bottom: 1rem;
        padding: 0.75rem;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 0.75rem;
    }

    .xp-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.8rem;
    }

    .xp-name {
        color: #9ca3af;
    }

    .xp-amount {
        color: #4ade80;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
    }

    .xp-total {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9rem;
        font-weight: 700;
        padding-top: 0.35rem;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        margin-top: 0.25rem;
        color: #d1d5db;
    }

    .xp-total-amount {
        color: #4ade80;
        font-size: 1rem;
    }

    /* Achievements */
    .achievements-section {
        margin-bottom: 1rem;
    }

    .achievements-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: #d1d5db;
        margin: 0 0 0.5rem;
    }

    .achievement-row {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.5rem;
        background: rgba(255, 107, 157, 0.05);
        border: 1px solid rgba(255, 107, 157, 0.1);
        border-radius: 0.5rem;
        margin-bottom: 0.35rem;
        animation: slideIn 0.3s ease-out;
    }

    .achievement-tier {
        font-size: 1.1rem;
        flex-shrink: 0;
    }

    .achievement-info {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
    }

    .achievement-name {
        font-size: 0.8rem;
        font-weight: 600;
        color: #e5e7eb;
    }

    .achievement-desc {
        font-size: 0.7rem;
        color: #6b7280;
    }

    /* Close Button */
    .close-btn {
        width: 100%;
        padding: 0.65rem;
        border: none;
        border-radius: 0.5rem;
        background: linear-gradient(135deg, #ff6b9d, #c084fc);
        color: white;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s;
    }

    .close-btn:hover {
        opacity: 0.9;
    }

    @keyframes bounce {
        0%,
        100% {
            transform: translateY(0);
        }
        40% {
            transform: translateY(-12px);
        }
        60% {
            transform: translateY(-4px);
        }
    }

    @keyframes slideIn {
        from {
            transform: translateX(-10px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
</style>
