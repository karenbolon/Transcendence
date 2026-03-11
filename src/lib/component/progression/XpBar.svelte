<script lang="ts">
	import type { Progression } from '$lib/types/progression';
	import { xpPercent } from "$lib/utils/format_progression";
	import { _, isLoading } from 'svelte-i18n';

	let { currentXp, xpToNextLevel, level }: Progression = $props();

	let percentage = $derived(xpPercent(currentXp, xpToNextLevel));
</script>

{#if !$isLoading}
<div class="xp-bar-container">
	<div class="xp-bar-header">
		<span class="xp-label">{$_('user_profile.level.label', { values: { level } })}</span>
		<span class="xp-numbers">{$_('user_profile.level.xp_progress', { values: { currentXp: currentXp.toLocaleString(), xpToNextLevel: xpToNextLevel.toLocaleString() } })}</span>

	</div>
	<div class="xp-bar-track">
		<div class="xp-bar-fill" style="width: {percentage}%">
			{#if percentage > 8}
				<span class="xp-percentage">{percentage}%</span>
			{/if}
		</div>
	</div>
	<span class="xp-next">{$_('user_profile.level.label', { values: { level: level + 1 } })}</span>
</div>
{/if}

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
		/* text-transform: uppercase;
		letter-spacing: 0.05em; */
	}

	.xp-numbers {
		font-size: 0.7rem;
		color: #7a7a9e;
		font-weight: 500;
		/* font-variant-numeric: tabular-nums; */
	}

	.xp-bar-track {
		width: 100%;
		height: 10px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 5px;
		overflow: hidden;
		position: relative;
	}

	.xp-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #a855f7, #ff6b9d);
		border-radius: 5px;
		transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding-right: 0.35rem;
		min-width: 0;
		position: relative;
		box-shadow: 0 0 8px rgba(168, 85, 247, 0.3);
	}
	.xp-percentage {
		font-size: 0.5rem;
		font-weight: 700;
		color: #fff;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	.xp-next {
		font-size: 0.62rem;
		color: #5a5a7e;
		text-align: right;
	}
</style>
