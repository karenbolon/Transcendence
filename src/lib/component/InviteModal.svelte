	<script lang="ts">
	import { fly } from 'svelte/transition';

	interface Props {
		inviteId: string;
		fromUsername: string;
		onAccept: () => void;
		onDecline: () => void;
	}

	let { inviteId, fromUsername, onAccept, onDecline }: Props = $props();

	let timeLeft = $state(30);

	$effect(() => {
		const interval = setInterval(() => {
				timeLeft--;
				if (timeLeft <= 0) {
					clearInterval(interval);
				}
		}, 1000);

		return () => clearInterval(interval);
	});
	</script>

	<div class="modal-overlay">
	<div class="modal" transition:fly={{ y: -50, duration: 300 }}>
		<div class="modal-header">
			<span class="icon">🏓</span>
			<h3>Game Challenge!</h3>
		</div>

		<p class="challenge-text">
			<strong>{fromUsername}</strong> has challenged you to a game of Pong!
		</p>

		<div class="timer" class:urgent={timeLeft <= 10}>
			{timeLeft}s remaining
		</div>

		<div class="actions">
			<button class="btn accept" onclick={onAccept}>Accept</button>
			<button class="btn decline" onclick={onDecline}>Decline</button>
		</div>
	</div>
	</div>

	<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
	}

	.modal {
		background: #1a1a2e;
		border: 1px solid #333;
		border-radius: 12px;
		padding: 2rem;
		max-width: 400px;
		width: 90%;
		text-align: center;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.modal-header .icon {
		font-size: 1.5rem;
	}

	.modal-header h3 {
		margin: 0;
		color: #fff;
		font-size: 1.3rem;
	}

	.challenge-text {
		color: #ccc;
		margin-bottom: 1rem;
	}

	.challenge-text strong {
		color: #fff;
	}

	.timer {
		color: #aaa;
		font-size: 0.9rem;
		margin-bottom: 1.5rem;
	}

	.timer.urgent {
		color: #ff4444;
		font-weight: bold;
	}

	.actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.btn {
		padding: 0.6rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		cursor: pointer;
		font-weight: 600;
	}

	.btn.accept {
		background: #4caf50;
		color: white;
	}

	.btn.accept:hover {
		background: #45a049;
	}

	.btn.decline {
		background: #555;
		color: #ccc;
	}

	.btn.decline:hover {
		background: #666;
	}
	</style>
