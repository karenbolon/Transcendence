<script lang="ts">
	import Modal from '$lib/component/Modal.svelte';
	import '$lib/styles/modal.css';

	type Props = {
		onLeave: () => void;
		onStay: () => void;
	};

	let { onLeave, onStay }: Props = $props();
</script>

<Modal open={true} onclose={onStay} zIndex={100}>
	<div class="modal">
		<div class="modal-header">
			<span class="warn-icon">⚠️</span>
			<h3 class="modal-title">Leave Queue?</h3>
		</div>

		<p class="modal-body">
			You're searching for a match. Leaving this page will remove you from the queue.
		</p>

		<div class="modal-actions">
			<button class="btn-stay" onclick={onStay}>Stay in Queue</button>
			<button class="btn-leave" onclick={onLeave}>Leave</button>
		</div>
	</div>
</Modal>

<style>
	.modal {
		background: #1a1a2e;
		border: 1px solid rgba(255, 107, 157, 0.2);
		border-radius: 0.75rem;
		padding: 1.5rem 2rem;
		max-width: 360px;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		animation: modal-scale-in 0.2s ease-out;
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.warn-icon {
		font-size: 1.3rem;
	}

	.modal-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: #ff6b9d;
		margin: 0;
	}

	.modal-body {
		font-size: 0.85rem;
		color: #9ca3af;
		text-align: center;
		margin: 0;
		line-height: 1.4;
	}

	.modal-actions {
		display: flex;
		gap: 0.5rem;
		width: 100%;
	}

	.btn-stay {
		flex: 1;
		padding: 0.6rem;
		border-radius: 0.5rem;
		border: none;
		background: #ff6b9d;
		color: #fff;
		font-size: 0.85rem;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-stay:hover {
		background: #ff85b1;
	}

	.btn-leave {
		flex: 1;
		padding: 0.6rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: transparent;
		color: #9ca3af;
		font-size: 0.85rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-leave:hover {
		border-color: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}
</style>
