<script lang="ts">
	type Props = {
		onReturn: () => void;
	};

	let { onReturn }: Props = $props();
</script>

<button class="pill" onclick={onReturn}>
	<span class="pill-icon">🏓</span>
	<span class="pill-text">Return to Match</span>
</button>

<style>
	.pill {
		position: fixed;
		top: 4.5rem;
		right: 1.25rem;
		z-index: 200;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 1.25rem;
		background: rgba(255, 107, 157, 0.12);
		border: 1px solid rgba(255, 107, 157, 0.35);
		border-radius: 999px;
		color: #ff6b9d;
		font-size: 0.85rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.2s;
		animation: pulse-glow 2s ease-in-out infinite;
		box-shadow: 0 0 20px rgba(255, 107, 157, 0.1);
	}

	.pill:hover {
		background: rgba(255, 107, 157, 0.2);
		border-color: rgba(255, 107, 157, 0.5);
		transform: scale(1.03);
		box-shadow: 0 0 30px rgba(255, 107, 157, 0.2);
	}

	.pill-icon {
		font-size: 1.1rem;
	}

	.pill-text {
		white-space: nowrap;
	}

	@keyframes pulse-glow {
		0%, 100% { box-shadow: 0 0 15px rgba(255, 107, 157, 0.1); }
		50% { box-shadow: 0 0 25px rgba(255, 107, 157, 0.25); }
	}
</style>
