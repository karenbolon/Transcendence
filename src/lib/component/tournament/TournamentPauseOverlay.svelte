<script lang="ts">
	import { onDestroy } from 'svelte';

	type Props = {
		isDisconnectedPlayer: boolean;
		initialRemaining: number;
		buttonsDelay: number;
		onClaimWin: () => void;
		onExtendPause: () => void;
	};

	let {
		isDisconnectedPlayer,
		initialRemaining,
		buttonsDelay,
		onClaimWin,
		onExtendPause,
	}: Props = $props();

	let remaining = $state(initialRemaining);
	let extensionsLeft = $state(3);
	let showButtons = $state(false);
	let startedAt = Date.now();

	const countdownInterval = setInterval(() => {
		const elapsed = Date.now() - startedAt;
		remaining = Math.max(0, initialRemaining - elapsed);

		if (!showButtons && elapsed >= buttonsDelay) {
			showButtons = true;
		}
	}, 100);

	onDestroy(() => clearInterval(countdownInterval));

	export function updateRemaining(newRemaining: number, newExtensionsLeft: number) {
		initialRemaining = newRemaining;
		remaining = newRemaining;
		extensionsLeft = newExtensionsLeft;
		startedAt = Date.now();
	}

	let seconds = $derived(Math.ceil(remaining / 1000));
	let minutes = $derived(Math.floor(seconds / 60));
	let displaySeconds = $derived(String(seconds % 60).padStart(2, '0'));
</script>

<div class="pause-overlay">
	<div class="pause-content">
		{#if isDisconnectedPlayer}
			<div class="pause-icon">
				<div class="spinner"></div>
			</div>
			<h2 class="pause-title">Connection Lost</h2>
			<p class="pause-subtitle">Reconnecting to your match...</p>
			<p class="pause-timer">{minutes}:{displaySeconds}</p>
		{:else}
			<div class="pause-icon">⏸</div>
			<h2 class="pause-title">Opponent Disconnected</h2>
			<p class="pause-subtitle">Waiting for reconnect...</p>
			<p class="pause-timer">{minutes}:{displaySeconds}</p>

			{#if showButtons}
				<div class="pause-actions">
					{#if extensionsLeft > 0}
						<button class="btn btn-extend" onclick={onExtendPause}>
							Wait 10 more seconds ({extensionsLeft} left)
						</button>
					{/if}
					<button class="btn btn-claim" onclick={onClaimWin}>
						Claim Win
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.pause-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(4px);
	}

	.pause-content {
		text-align: center;
		padding: 2.5rem 3rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1rem;
		max-width: 400px;
	}

	.pause-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.pause-title {
		font-size: 1.3rem;
		font-weight: 700;
		color: #f3f4f6;
		margin: 0 0 0.5rem;
	}

	.pause-subtitle {
		font-size: 0.85rem;
		color: #9ca3af;
		margin: 0 0 1rem;
	}

	.pause-timer {
		font-family: 'Press Start 2P', monospace;
		font-size: 2rem;
		color: #fbbf24;
		margin: 0 0 1.5rem;
	}

	.pause-actions {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.btn {
		padding: 0.7rem 1.5rem;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-extend {
		background: transparent;
		border: 1px solid rgba(96, 165, 250, 0.3);
		color: #60a5fa;
	}
	.btn-extend:hover {
		background: rgba(96, 165, 250, 0.1);
	}

	.btn-claim {
		background: rgba(239, 68, 68, 0.15);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #f87171;
	}
	.btn-claim:hover {
		background: rgba(239, 68, 68, 0.25);
	}

	.spinner {
		width: 48px;
		height: 48px;
		margin: 0 auto;
		border: 3px solid rgba(255, 107, 157, 0.15);
		border-top-color: #ff6b9d;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
