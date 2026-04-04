<script lang="ts">
	type Props = {
		disconnectedUsername: string;
		remainingMs: number;
		canAct: boolean;
		extensionsLeft: number;
		onExtend: () => void;
		onClaimWin: () => void;
	};

	let {
		disconnectedUsername,
		remainingMs,
		canAct,
		extensionsLeft,
		onExtend,
		onClaimWin,
	}: Props = $props();

	let secondsRemaining = $derived(Math.max(0, Math.ceil(remainingMs / 1000)));
</script>

<div class="pause-overlay">
	<div class="pause-card">
		<div class="pause-label">Tournament Paused</div>
		<h3 class="pause-title">{disconnectedUsername} disconnected</h3>
		<p class="pause-copy">
			The match is paused while we wait for them to reconnect.
		</p>
		<div class="pause-timer">{secondsRemaining}s</div>

		{#if canAct}
			<div class="pause-actions">
				<button class="pause-btn secondary" onclick={onExtend} disabled={extensionsLeft <= 0}>
					Wait 10 More
				</button>
				<button class="pause-btn primary" onclick={onClaimWin}>
					Claim Win
				</button>
			</div>
			<div class="pause-note">
				{#if extensionsLeft > 0}
					{extensionsLeft} extension{extensionsLeft === 1 ? '' : 's'} left
				{:else}
					No extensions left
				{/if}
			</div>
		{:else}
			<div class="pause-note">Reconnect to resume the match.</div>
		{/if}
	</div>
</div>

<style>
	.pause-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgba(6, 10, 23, 0.72);
		backdrop-filter: blur(8px);
		z-index: 4;
	}

	.pause-card {
		width: min(100%, 420px);
		padding: 1.4rem 1.3rem;
		border-radius: 0.9rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(14, 18, 36, 0.96);
		text-align: center;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
	}

	.pause-label {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #fbbf24;
		margin-bottom: 0.55rem;
	}

	.pause-title {
		margin: 0;
		font-size: 1.25rem;
		color: #f3f4f6;
	}

	.pause-copy {
		margin: 0.65rem 0 1rem;
		color: #cbd5e1;
		line-height: 1.5;
		font-size: 0.92rem;
	}

	.pause-timer {
		font-size: 2rem;
		font-weight: 800;
		color: #ff6b9d;
		margin-bottom: 1rem;
	}

	.pause-actions {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.pause-btn {
		padding: 0.72rem 1rem;
		border-radius: 0.65rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		font: inherit;
		cursor: pointer;
		transition: transform 0.15s, border-color 0.15s, background 0.15s;
	}

	.pause-btn:hover:enabled {
		transform: translateY(-1px);
	}

	.pause-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.pause-btn.secondary {
		background: rgba(255, 255, 255, 0.06);
		color: #d1d5db;
	}

	.pause-btn.primary {
		background: rgba(255, 107, 157, 0.18);
		border-color: rgba(255, 107, 157, 0.35);
		color: #ffd4e4;
	}

	.pause-note {
		margin-top: 0.9rem;
		font-size: 0.82rem;
		color: #94a3b8;
	}
</style>
