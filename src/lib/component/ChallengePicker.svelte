<script lang="ts">
	import { speedEmoji } from '$lib/utils/format_game';
	import UserAvatar from './UserAvatar.svelte';

	type SpeedOption = 'chill' | 'normal' | 'fast';

	type Props = {
		targetName: { username: string; displayName: string | null; avatarUrl: string | null };
		onSend: (settings: { speedPreset: string; winScore: number }) => void;
		onCancel: () => void;
	};

	let { targetName, onSend, onCancel }: Props = $props();

	let speedPreset = $state<SpeedOption>('normal');
	let winScore = $state(5);

	const speedOptions: { label: SpeedOption; emoji: string }[] = [
		{ label: 'chill', emoji: speedEmoji('chill') },
		{ label: 'normal', emoji: speedEmoji('normal') },
		{ label: 'fast', emoji: speedEmoji('fast') }
	];

	const scoreOptions = [
		{ value: 3, label: 'Quick' },
		{ value: 5, label: 'Standard' },
		{ value: 7, label: 'Long' },
		{ value: 11, label: 'Marathon' }
	];

	function handleSend() {
		onSend({ speedPreset, winScore });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onCancel();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="challenge-overlay">
	<div class="challenge-picker" onclick={(e) => e.stopPropagation()}>
		<div class="modal">
			<h2 class="title-modal">Challenge</h2>
			<button class="close-btn" onclick={onCancel}>&times;</button>

			<!-- Header -->
			<div class="header">
				<div class="avatar">
					<UserAvatar avatarUrl={targetName.avatarUrl} username={targetName.username} displayName={targetName.displayName} size="lg" />
				</div>
				<div class="header-text">
					<h2 class="title">{targetName.displayName ?? targetName.username}</h2>
					<p class="subtitle">Pick your game settings</p>
				</div>
			</div>
					<div class="option-group">
			<span class="option-label">Speed</span>
			<div class="options">
				{#each speedOptions as opt}
					<button
						class="opt-btn"
						class:selected={speedPreset === opt.label}
						onclick={() => speedPreset = opt.label}
					>
						<span class="opt-emoji">{opt.emoji}</span>
						<span class="opt-text">{opt.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Win Score -->
		<div class="option-group">
			<span class="option-label">First to</span>
			<div class="options">
				{#each scoreOptions as opt}
					<button
						class="opt-btn"
						class:selected={winScore === opt.value}
						onclick={() => winScore = opt.value}
					>
						<span class="opt-emoji">{opt.value}</span>
						<span class="opt-text">{opt.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="divider"></div>

		<!-- Send -->
		<button class="send-btn" onclick={handleSend}>
				⚔️ Send Challenge
			</button>
			<p class="note">{targetName.username} will have 30 seconds to accept</p>
		</div>
	</div>
</div>

<style>
	.challenge-overlay {
		position: fixed;
		inset: 0;
		background: rgba(5, 5, 15, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		animation: fade-in 0.25s ease;
		backdrop-filter: blur(4px);
	}

	.challenge-picker {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	.modal {
		background: linear-gradient(160deg, #1a1035 0%, #0d1525 100%);
		border: 1px solid rgba(255, 107, 157, 0.12);
		border-radius: 1rem;
		padding: 2.8rem 2.55rem;
		max-width: 480px;
		width: calc(100% - 2rem);
		animation: pop-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 60px rgba(255, 107, 157, 0.04);
		position: relative;
		overflow: hidden;
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.06);
		color: #7a7a9e;
		font-size: 1.25rem;
		line-height: 1;
		padding: 0.2rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #d1d5db;
	}

	/* ── HEADER ────────────────────────────── */
	.header {
		display: flex;
		align-items: center;
		gap: 0.95rem;
		margin-bottom: 1.5rem;
	}
	.title-modal {
		font-size: 1.1rem;
		font-weight: 700;
		color: #f3f4f6;
		margin: 0;
		padding: 0.5rem;
	}

	.title {
		font-size: 1.1rem;
		font-weight: 700;
		color: #f3f4f6;
		margin: 0;
	}

	.subtitle {
		font-size: 0.78rem;
		color: #6b7280;
		margin: 0.1rem 0 0;
	}

	/* ── OPTIONS ───────────────────────────── */
	.option-group {
		margin-bottom: 1.35rem;
	}

	.option-label {
		display: block;
		font-size: 0.72rem;
		font-weight: 600;
		color: #9ca3af;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-bottom: 0.5rem;
	}

	.options {
		display: flex;
		gap: 0.4rem;
	}

	.opt-btn {
		flex: 1;
		padding: 0.6rem 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		color: #9ca3af;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
	}

	.opt-btn:hover {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.15);
		color: #d1d5db;
	}

	.opt-btn.selected {
		border-color: #ff6b9d;
		background: rgba(255, 107, 157, 0.08);
		color: #ff6b9d;
	}

	.opt-emoji {
		font-size: 1.5rem;
	}

	.opt-text {
		font-size: 0.75rem;
		font-weight: 500;
	}

	/* ── FOOTER ────────────────────────────── */
	.divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.04);
		margin: 1.25rem 0;
	}

	.send-btn {
		width: 100%;
		padding: 0.75rem;
		border: none;
		border-radius: 0.6rem;
		background: #ff6b9d;
		color: #fff;
		font-size: 0.95rem;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.send-btn:hover {
		background: #ff85b1;
		transform: scale(1.01);
	}

	.note {
		text-align: center;
		margin-top: 0.6rem;
		font-size: 0.7rem;
		color: #4b5563;
	}

	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes pop-in {
		from { opacity: 0; transform: scale(0.85); }
		to { opacity: 1; transform: scale(1); }
	}
</style>
