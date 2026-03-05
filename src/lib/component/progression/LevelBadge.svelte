<script lang="ts">
	type Props = {
		level: number;
		size?: "sm" | "md" | "lg";
	};

	let { level, size = "md" }: Props = $props();

	const MILESTONES: { minLevel: number; icon: string; title: string }[] = [
		{ minLevel: 50, icon: "👑", title: "Transcendent" },
		{ minLevel: 30, icon: "🦄", title: "Legend" },
		{ minLevel: 20, icon: "💎", title: "Diamond" },
		{ minLevel: 10, icon: "🔥", title: "Flame" },
		{ minLevel: 5, icon: "⚡", title: "Spark" },
		{ minLevel: 0, icon: "🌱", title: "Seedling" },
	];

	let milestone = $derived(
		MILESTONES.find((m) => level >= m.minLevel) ??
			MILESTONES[MILESTONES.length - 1],
	);
</script>

<div
	class="level-badge level-badge--{size}"
	title="{milestone.title} — Level {level}"
>
	<span class="badge-icon">{milestone.icon}</span>
	<span class="badge-level">{level}</span>
</div>

<style>
	.level-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 999px;
		padding: 0.2rem 0.6rem;
		white-space: nowrap;
	}

	.level-badge--sm {
		padding: 0.15rem 0.45rem;
	}

	.level-badge--sm .badge-icon {
		font-size: 0.8rem;
	}

	.level-badge--sm .badge-level {
		font-size: 0.7rem;
	}

	.level-badge--md .badge-icon {
		font-size: 1rem;
	}

	.level-badge--md .badge-level {
		font-size: 0.85rem;
	}

	.level-badge--lg {
		padding: 0.35rem 0.8rem;
	}

	.level-badge--lg .badge-icon {
		font-size: 1.3rem;
	}

	.level-badge--lg .badge-level {
		font-size: 1.1rem;
	}

	.badge-level {
		font-weight: 700;
		color: #d1d5db;
		font-variant-numeric: tabular-nums;
	}
</style>
