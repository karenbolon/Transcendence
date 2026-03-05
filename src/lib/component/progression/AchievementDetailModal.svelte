<script lang="ts">
	import { formatJoinDate } from "$lib/utils/format_date";
	import { XP_REWARDS, TIER_COLORS, RARITY_PERCENT, capitalize } from '$lib/utils/format_progression';
	import type { Achievement } from '$lib/types/progression';

	type Props = {
		achievement: Achievement | null;
		onclose: () => void;
	};

	let { achievement, onclose }: Props = $props();

	let earned = $derived(!!achievement?.unlockedAt);

	let xp = $derived(XP_REWARDS[achievement?.tier ?? 'bronze'] ?? 50);
	let rarity = $derived(RARITY_PERCENT[achievement?.tier ?? 'bronze'] ?? '50%');
	let tierColor = $derived(
		TIER_COLORS[achievement?.tier ?? 'bronze'] ?? '#7a7a9e',
	);
	let tierLabel = $derived(achievement ? capitalize(achievement.tier) : '');

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if achievement}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={onclose}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-panel" onclick={(e) => e.stopPropagation()}>
			<!-- Top section -->
			<div class="modal-top">
				<div
					class="tier-bg"
					style="background: linear-gradient(90deg, transparent, {tierColor}, transparent)"
				></div>
				<span
					class="modal-icon"
					class:locked={!earned}
				>
					{achievement.icon}
				</span>
				<div class="modal-name" class:locked-name={!earned}>
					{achievement.name}
				</div>
				<div class="modal-desc">{achievement.description}</div>
			</div>

			<!-- Body -->
			<div class="modal-body">
				<!-- Tier -->
				<div class="modal-row">
					<span class="row-label">Tier</span>
					<span class="row-value tier-badge {achievement.tier}"
						>{tierLabel}</span
					>
				</div>

				<!-- XP -->
				<div class="modal-row">
					<span class="row-label"
						>{earned ? 'XP Earned' : 'XP Reward'}</span
					>
					<span class="row-value xp">+{xp} XP</span>
				</div>

				<!-- Rarity -->
				<div class="modal-row">
					<span class="row-label">Players Earned</span>
					<div class="rarity">
						<div
							class="rarity-dot"
							style="background: {tierColor}"
						></div>
						<span class="rarity-text">{rarity} of players</span>
					</div>
				</div>

				<!-- Unlock date (earned only) -->
				{#if earned && achievement.unlockedAt}
					<div class="modal-row">
						<span class="row-label">Unlocked</span>
						<span class="row-value date"
							>{formatJoinDate(achievement.unlockedAt)}</span
						>
					</div>
				{/if}

				<!-- Progress bar (locked with progress) -->
				{#if achievement.progress}
					{@const [current, target] = achievement.progress}
					{@const pct = Math.round((current / target) * 100)}
					<div class="progress-section">
						<div class="progress-header">
							<span class="progress-label">Progress</span>
							<span class="progress-nums"
								>{current} / {target}</span
							>
						</div>
						<div class="progress-track">
							<div
								class="progress-fill"
								style="width: {pct}%; background: linear-gradient(90deg, {tierColor}, {tierColor}88)"
							></div>
						</div>
						{#if achievement.hint}
							<div class="progress-hint">{achievement.hint}</div>
						{/if}
					</div>
				{:else if !earned && achievement.hint}
					<div class="progress-section">
						<div class="progress-hint">{achievement.hint}</div>
					</div>
				{/if}
			</div>

			<!-- Close -->
			<button class="modal-close" onclick={onclose}>Close</button>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: rgba(10, 10, 26, 0.8);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		animation: fade-in 0.15s ease-out;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.modal-panel {
		width: 100%;
		max-width: 380px;
		background: linear-gradient(145deg, #181840, #12122e);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1.1rem;
		overflow: hidden;
		box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
		animation: modal-in 0.25s ease-out;
	}

	@keyframes modal-in {
		from {
			opacity: 0;
			transform: scale(0.92) translateY(12px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	/* Top */
	.modal-top {
		position: relative;
		padding: 2rem 1.5rem 1.25rem;
		text-align: center;
		overflow: hidden;
	}

	.tier-bg {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		opacity: 0.7;
	}

	.modal-icon {
		font-size: 3.5rem;
		margin-bottom: 0.5rem;
		display: block;
		animation: icon-pop 0.4s ease-out;
	}

	.modal-icon.locked {
		opacity: 0.3;
		filter: grayscale(1);
	}

	@keyframes icon-pop {
		0% {
			transform: scale(0.5);
			opacity: 0;
		}
		60% {
			transform: scale(1.15);
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.modal-name {
		font-size: 1.15rem;
		font-weight: 700;
		color: #fff;
		margin-bottom: 0.25rem;
	}

	.modal-name.locked-name {
		color: #5a5a7e;
	}

	.modal-desc {
		font-size: 0.82rem;
		color: #9ca3af;
		line-height: 1.5;
	}

	/* Body */
	.modal-body {
		padding: 0 1.5rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.modal-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.45rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	}

	.modal-row:last-child {
		border: none;
	}

	.row-label {
		font-size: 0.75rem;
		color: #7a7a9e;
	}

	.row-value {
		font-size: 0.78rem;
		font-weight: 600;
		color: #d1d5db;
	}

	.row-value.xp {
		color: #a855f7;
	}

	.row-value.date {
		color: #ff6b9d;
	}

	/* Tier badges */
	.tier-badge {
		padding: 0.1rem 0.5rem;
		border-radius: 1rem;
		font-size: 0.7rem;
	}

	.tier-badge.bronze {
		color: #cd7f32;
		background: rgba(205, 127, 50, 0.12);
	}
	.tier-badge.silver {
		color: #c0c0d2;
		background: rgba(192, 192, 210, 0.1);
	}
	.tier-badge.gold {
		color: #ffd700;
		background: rgba(255, 215, 0, 0.1);
	}
	.tier-badge.legendary {
		color: #a855f7;
		background: rgba(168, 85, 247, 0.12);
	}

	/* Rarity */
	.rarity {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.rarity-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.rarity-text {
		font-size: 0.72rem;
		color: #9ca3af;
	}

	/* Progress */
	.progress-section {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.4rem 0;
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
	}

	.progress-label {
		font-size: 0.72rem;
		color: #7a7a9e;
	}

	.progress-nums {
		font-size: 0.72rem;
		color: #d1d5db;
		font-weight: 600;
	}

	.progress-track {
		width: 100%;
		height: 8px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.8s;
	}

	.progress-hint {
		font-size: 0.65rem;
		color: #5a5a7e;
		font-style: italic;
		margin-top: 0.1rem;
	}

	/* Close */
	.modal-close {
		display: block;
		width: 100%;
		padding: 0.65rem;
		border: none;
		background: rgba(255, 255, 255, 0.04);
		color: #7a7a9e;
		font-family: inherit;
		font-size: 0.82rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
		border-top: 1px solid rgba(255, 255, 255, 0.04);
	}

	.modal-close:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
	}
</style>