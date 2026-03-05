<script lang="ts">
	import { XP_REWARDS } from '$lib/utils/format_progression';
	import type { Achievement } from '$lib/types/progression';

	type Props = Achievement & {
		onclick?: () => void;
		size?: 'md' | 'lg';
	};

	let {
		name,
		description,
		tier,
		icon,
		unlockedAt,
		progress = null,
		hint = null,
		onclick,
		size = 'lg',
		// icon = "🏆",
		// unlockedAt = null,
	}: Props = $props();

	let earned = $derived(!!unlockedAt);

	// const tierEmojis: Record<string, string> = {
	// 	bronze: "🥉",
	// 	silver: "🥈",
	// 	gold: "🥇",
	// };

	// let tierEmoji = $derived(tierEmojis[tier] ?? "🏅");
	// let isUnlocked = $derived(!!unlockedAt);

	let xp = $derived(XP_REWARDS[tier] ?? 50);
</script>

<button
	class="achievement-card {tier}"
	class:earned
	class:locked={!earned}
	title={earned ? description : 'Keep playing to unlock'}
	onclick={onclick}
	type="button"
>
	<!-- Tier glow line -->
	<div class="tier-line"></div>

	<!-- Icon -->
	<div class="card-icon">
		{#if earned}
			{icon}
		{:else}
			🔒
		{/if}
	</div>

	<!-- Info -->
	<div class="card-info">
		<span class="card-name">{earned ? name : '???'}</span>
		<span class="card-desc">{earned ? description : 'Keep playing to unlock'}</span>
	</div>

	<!-- Footer — only on Large -->
	<!-- Tier + XP -->
	{#if earned && size === 'lg'}
		<div class="card-footer">
			<span class="card-tier">{tier}</span>
			<span class="card-xp">+{xp} XP</span>
		</div>
	{/if}
</button>

<style>
	.achievement-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 0.65rem 1.75rem;
		border-radius: 0.75rem;
		background: linear-gradient(135deg, rgba(22, 22, 58, 0.8), rgba(16, 16, 42, 0.9));
		border: 1px solid transparent;
		text-align: center;
		transition: all 0.25s;
		overflow: hidden;
		cursor: pointer;
		width: 100%;
		font-family: inherit;
		color: inherit;
	}

	/* Locked */
	.achievement-card.locked {
		opacity: 0.35;
		filter: grayscale(0.5);
	}

	/* Earned */
	.achievement-card.earned {
		background: rgba(255, 255, 255, 0.03);
	}

	.achievement-card.earned:hover {
		transform: translateY(-2px);
	}

	/* Tier glow line */
	.tier-line {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		opacity: 0;
		transition: opacity 0.25s;
	}

	.achievement-card.earned .tier-line {
		opacity: 0.6;
	}

	/* Tier colors */
	.achievement-card.bronze.earned {
		border-color: rgba(205, 127, 50, 0.15);
	}
	.achievement-card.bronze.earned:hover {
		border-color: rgba(205, 127, 50, 0.3);
		box-shadow: 0 4px 20px rgba(205, 127, 50, 0.06);
	}
	.achievement-card.bronze .tier-line {
		background: linear-gradient(90deg, transparent, #cd7f32, transparent);
	}

	.achievement-card.silver.earned {
		border-color: rgba(192, 192, 210, 0.15);
	}
	.achievement-card.silver.earned:hover {
		border-color: rgba(192, 192, 210, 0.25);
		box-shadow: 0 4px 20px rgba(192, 192, 210, 0.06);
	}
	.achievement-card.silver .tier-line {
		background: linear-gradient(90deg, transparent, #c0c0d2, transparent);
	}

	.achievement-card.gold.earned {
		border-color: rgba(255, 215, 0, 0.15);
	}
	.achievement-card.gold.earned:hover {
		border-color: rgba(255, 215, 0, 0.3);
		box-shadow: 0 4px 20px rgba(255, 215, 0, 0.06);
	}
	.achievement-card.gold .tier-line {
		background: linear-gradient(90deg, transparent, #ffd700, transparent);
	}

	.achievement-card.legendary.earned {
		border-color: rgba(168, 85, 247, 0.2);
	}
	.achievement-card.legendary.earned:hover {
		border-color: rgba(168, 85, 247, 0.35);
		box-shadow: 0 4px 20px rgba(168, 85, 247, 0.08);
	}
	.achievement-card.legendary .tier-line {
		background: linear-gradient(90deg, transparent, #a855f7, transparent);
	}

	/* Icon */
	.card-icon {
		font-size: 1.75rem;
		line-height: 1;
		margin-bottom: 0.15rem;
		transition: transform 0.3s;
	}

	.achievement-card.earned:hover .card-icon {
		transform: scale(1.15);
	}

	/* Info */
	.card-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-height: 2.2rem;
	}

	.card-name {
		font-size: 0.72rem;
		font-weight: 600;
		color: #6b7280;
		line-height: 1.3;
	}

	.achievement-card.earned .card-name {
		color: #e5e7eb;
	}

	.card-desc {
		font-size: 0.6rem;
		color: #4b5563;
		line-height: 1.35;
		display: -webkit-box;
		/* -webkit-line-clamp: 2; */
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.achievement-card.earned .card-desc {
		color: #7a7a9e;
	}

	/* Footer */
	.card-footer {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.15rem;
	}

	.card-tier {
		font-size: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 700;
		padding: 0.08rem 0.35rem;
		border-radius: 1rem;
	}

	.achievement-card.bronze .card-tier {
		color: #cd7f32;
		background: rgba(205, 127, 50, 0.12);
	}
	.achievement-card.silver .card-tier {
		color: #c0c0d2;
		background: rgba(192, 192, 210, 0.1);
	}
	.achievement-card.gold .card-tier {
		color: #ffd700;
		background: rgba(255, 215, 0, 0.1);
	}
	.achievement-card.legendary .card-tier {
		color: #a855f7;
		background: rgba(168, 85, 247, 0.12);
	}

	.card-xp {
		font-size: 0.5rem;
		font-weight: 600;
		color: #a855f7;
		background: rgba(168, 85, 247, 0.1);
		padding: 0.08rem 0.35rem;
		border-radius: 1rem;
	}
</style>