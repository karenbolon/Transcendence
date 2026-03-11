<script lang="ts">
	import { getTierColor } from '$lib/utils/format_progression';
	import type { LevelSizeProps } from '$lib/types/progression';
	import { _, isLoading } from 'svelte-i18n';

	let { level, size = "md" }: LevelSizeProps = $props();
	let tierColor = $derived(getTierColor(level));
</script>

{#if !$isLoading}
<div class="level-badge {size}" title={$_('user_profile.level.label', { values: { level } })}>
	<div
		class="level-ring"
		style="background: linear-gradient(135deg, {tierColor.from}, {tierColor.to});"
	>
		<div class="level-inner">
			<span class="level-num">{level}</span>
		</div>
	</div>
	<span class="level-label">{$_('user_profile.level.short')}</span>
</div>
{/if}

<style>
	.level-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.level-ring {
		border-radius: 50%;
		padding: 2px;
		box-shadow: 0 0 12px rgba(168, 85, 247, 0.2);
	}

	.level-inner {
		background: #0a0a1a;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.level-num {
		font-weight: 700;
		color: #fff;
		line-height: 1;
	}

	.level-label {
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 700;
		color: #5a5a7e;
		padding: 0.3rem;
	}

	/* ── Sizes ── */
	.level-badge.sm .level-ring { padding: 1.5px; }
	.level-badge.sm .level-inner { width: 28px; height: 28px; }
	.level-badge.sm .level-num { font-size: 0.7rem; }
	.level-badge.sm .level-label { font-size: 0.42rem; }

	.level-badge.md .level-ring { padding: 2px; }
	.level-badge.md .level-inner { width: 38px; height: 38px; }
	.level-badge.md .level-num { font-size: 0.9rem; }
	.level-badge.md .level-label { font-size: 0.68rem; }

	.level-badge.lg .level-ring { padding: 3px; }
	.level-badge.lg .level-inner { width: 52px; height: 52px; }
	.level-badge.lg .level-num { font-size: 1.2rem; }
	.level-badge.lg .level-label { font-size: 0.55rem; }
</style>