<script lang="ts">
    type Props = {
        id: string;
        name: string;
        description: string;
        tier: string;
        icon?: string;
        unlockedAt?: Date | string | null;
    };

    let {
        name,
        description,
        tier,
        icon = "🏆",
        unlockedAt = null,
    }: Props = $props();

    const tierEmojis: Record<string, string> = {
        bronze: "🥉",
        silver: "🥈",
        gold: "🥇",
    };

    let tierEmoji = $derived(tierEmojis[tier] ?? "🏅");
    let isUnlocked = $derived(!!unlockedAt);

    function formatDate(date: Date | string): string {
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }
</script>

<div
    class="achievement-card"
    class:locked={!isUnlocked}
    class:unlocked={isUnlocked}
>
    <div class="card-icon">{isUnlocked ? icon : "🔒"}</div>
    <div class="card-content">
        <div class="card-header">
            <span class="card-name">{name}</span>
            <span class="card-tier">{tierEmoji}</span>
        </div>
        <p class="card-desc">{description}</p>
        {#if isUnlocked && unlockedAt}
            <span class="card-date">Unlocked {formatDate(unlockedAt)}</span>
        {/if}
    </div>
</div>

<style>
    .achievement-card {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        transition: all 0.2s ease;
    }

    .achievement-card.unlocked {
        border-color: rgba(255, 107, 157, 0.15);
    }

    .achievement-card.unlocked:hover {
        border-color: rgba(255, 107, 157, 0.3);
        background: rgba(255, 107, 157, 0.03);
    }

    .achievement-card.locked {
        opacity: 0.5;
    }

    .card-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
        width: 2rem;
        text-align: center;
    }

    .card-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .card-header {
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .card-name {
        font-size: 0.85rem;
        font-weight: 600;
        color: #e5e7eb;
    }

    .card-tier {
        font-size: 0.8rem;
    }

    .card-desc {
        font-size: 0.75rem;
        color: #6b7280;
        margin: 0;
        line-height: 1.3;
    }

    .card-date {
        font-size: 0.65rem;
        color: #4b5563;
        margin-top: 0.15rem;
    }
</style>
