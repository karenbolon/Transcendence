<script lang="ts">
	type Props = {
		searchTime: number;
		queuePosition: number;
		playersOnline: number;
		onCancel: () => void;
	};

	let { searchTime, queuePosition, playersOnline, onCancel }: Props = $props();
</script>

<div class="queue-banner">
	<div class="banner-left">
		<span class="banner-dot"></span>
		<span class="banner-text">Searching for match...</span>
		<span class="banner-time">{Math.floor(searchTime / 60)}:{String(searchTime % 60).padStart(2, '0')}</span>
		<span class="banner-sep">|</span>
		<span class="banner-info">#{queuePosition} in queue</span>
		<span class="banner-sep">|</span>
		<span class="banner-info">{playersOnline} online</span>
	</div>
	<button class="banner-cancel" onclick={onCancel}>Cancel</button>
</div>

<style>
	.queue-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		background: rgba(255, 107, 157, 0.06);
		border: 1px solid rgba(255, 107, 157, 0.15);
		width: 100%;
		max-width: 900px;
	}

	.banner-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
	}

	.banner-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #ff6b9d;
		animation: blink 2s ease infinite;
	}

	.banner-text {
		color: #ff6b9d;
		font-weight: 600;
	}

	.banner-time {
		color: #d1d5db;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.banner-sep {
		color: #374151;
	}

	.banner-info {
		color: #6b7280;
	}

	.banner-cancel {
		padding: 0.25rem 0.75rem;
		border-radius: 0.4rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: transparent;
		color: #9ca3af;
		font-size: 0.75rem;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.banner-cancel:hover {
		border-color: rgba(248, 113, 113, 0.3);
		color: #f87171;
	}

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}
</style>
