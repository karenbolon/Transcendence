<script lang="ts">
	import { fly } from 'svelte/transition';
	import { toasts, removeToast } from '$lib/stores/toast.svelte';

</script>

{#if toasts.length > 0}
	<div class="toast-container">
		{#each toasts as toast (toast.id) }
			<div class="toast toast-{toast.type}" transition:fly={{ x: 300, duration: 300 }}>
				<span class="toast-icon">
					{#if toast.type === 'success'}
						&#10003;
					{:else if toast.type === 'error'}
						&#10007;
					{:else}
						&#9432;
					{/if}
				</span>
				<span class="toast-message">{toast.message}</span>
				<button class="toast-dismiss" onclick={() => removeToast(toast.id)}>
					&times;
				</button>
			</div>
		{/each}
	</div>
{/if}

// If the toast is for the message it should have a button? and  for the game request?
// the rest should have a time or a close button
<style>
	.toast-container {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		pointer-events: none;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: 0.6rem;
		background: rgba(22, 22, 58, 0.95);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-left: 3px solid;
		color: #e5e7eb;
		font-size: 0.85rem;
		font-weight: 500;
		min-width: 250px;
		max-width: 380px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		pointer-events: all;
	}

	.toast--success { border-left-color: #22c55e; }
	.toast--error   { border-left-color: #ef4444; }
	.toast--warning { border-left-color: #eab308; }
	.toast--info    { border-left-color: #60a5fa; }

	.toast-message {
		flex: 1;
	}

	.toast-close {
		background: none;
		border: none;
		color: #6b7280;
		cursor: pointer;
		font-size: 0.8rem;
		padding: 0.2rem;
		line-height: 1;
		transition: color 0.15s;
	}

	.toast-close:hover {
		color: #e5e7eb;
	}
	</style>
