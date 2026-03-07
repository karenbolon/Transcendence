<script lang="ts">
    type Props = {
        currentXp: number;
        xpToNextLevel: number;
        level: number;
    };

    let { currentXp, xpToNextLevel, level }: Props = $props();

    let percentage = $derived(
        xpToNextLevel > 0
            ? Math.min((currentXp / xpToNextLevel) * 100, 100)
            : 0,
    );
</script>

<div class="xp-bar-container">
    <div class="xp-bar-header">
        <span class="xp-label">Level {level}</span>
        <span class="xp-numbers">{currentXp} / {xpToNextLevel} XP</span>
    </div>
    <div class="xp-bar-track">
        <div class="xp-bar-fill" style="width: {percentage}%"></div>
    </div>
</div>

<style>
    .xp-bar-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    .xp-bar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .xp-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #d1d5db;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .xp-numbers {
        font-size: 0.7rem;
        color: #6b7280;
        font-variant-numeric: tabular-nums;
    }

    .xp-bar-track {
        width: 100%;
        height: 8px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 4px;
        overflow: hidden;
    }

    .xp-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #ff6b9d, #c084fc);
        border-radius: 4px;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 8px rgba(255, 107, 157, 0.3);
    }
</style>
