<script lang="ts">
	type Props = {
		level: number;
		size?: 'sm' | 'md' | 'lg';
	};

	let { level, size = 'md' }: Props = $props();

	// Color tiers based on level
	let tierColor = $derived(() => {
		if (level >= 50) return { from: '#ffd700', to: '#ff8c00', label: 'legendary' };
		if (level >= 30) return { from: '#a855f7', to: '#7c3aed', label: 'epic' };
		if (level >= 20) return { from: '#ff6b9d', to: '#e84393', label: 'gold' };
		if (level >= 10) return { from: '#60a5fa', to: '#3b82f6', label: 'silver' };
		return { from: '#4ade80', to: '#22c55e', label: 'bronze' };
	});
</script>

<div class="level-badge {size}" title="Level {level}">
	<div
		class="level-ring"
		style="background: linear-gradient(135deg, {tierColor().from}, {tierColor().to});"
	>
		<div class="level-inner">
			<span class="level-num">{level}</span>
		</div>
	</div>
	<span class="level-label">LVL</span>
</div>

<style>
	.level-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
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