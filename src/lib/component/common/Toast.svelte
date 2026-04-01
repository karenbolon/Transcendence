<script lang="ts">
	import { fly } from 'svelte/transition';
	import { toasts, toast, TOAST_CONFIG } from '$lib/stores/toast.svelte';

</script>

	{#if toasts.length > 0}
		<div class="toast-container">
			{#each toasts as t (t.id) }
				{#if t.onclick}
					<button
						type="button"
						class="toast toast--{t.type} clickable"
						style="--toast-color: {TOAST_CONFIG[t.type].color};"
						transition:fly={{ x: 300, duration: 300 }}
						onclick={() => { t.onclick?.(); toast.dismiss(t.id); }}
						aria-label={t.title}
					>
						<span class="toast-icon">{t.icon}</span>
						<div class="toast-body">
							<span class="toast-title">{t.title}</span>
							{#if t.message}
								<span class="toast-message">{t.message}</span>
							{/if}
						</div>
						<div class="toast-progress">
							<div
								class="toast-progress-bar"
								style="animation-duration: {t.duration}ms;"
							></div>
						</div>
					</button>
				{:else}
					<div
						class="toast toast--{t.type}"
						style="--toast-color: {TOAST_CONFIG[t.type].color};"
						transition:fly={{ x: 300, duration: 300 }}
					>
						<span class="toast-icon">{t.icon}</span>
						<div class="toast-body">
							<span class="toast-title">{t.title}</span>
							{#if t.message}
								<span class="toast-message">{t.message}</span>
							{/if}
						</div>
						<button class="toast-dismiss" onclick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}>
							&times;
						</button>
						<div class="toast-progress">
							<div
								class="toast-progress-bar"
								style="animation-duration: {t.duration}ms;"
							></div>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}

<style>
	.toast-container {
		position: fixed;
		top: 1.5rem;
		right: 1.5rem;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		pointer-events: none;
	}

	.toast {
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.85rem 1rem 1rem;
		border-radius: 0.6rem;
		background: rgba(22, 22, 58, 0.95);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-left: 3px solid var(--toast-color);
		color: #e5e7eb;
		font-size: 0.85rem;
		min-width: 250px;
		max-width: 380px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		pointer-events: all;
		overflow: hidden;
	}

	button.toast {
		font: inherit;
		text-align: left;
		background: rgba(22, 22, 58, 0.95);
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		border-right: 1px solid rgba(255, 255, 255, 0.08);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		border-left: 3px solid var(--toast-color);
	}

	.toast.clickable {
		cursor: pointer;
	}

	.toast.clickable:hover {
		border-color: rgba(255, 255, 255, 0.15);
		background: rgba(22, 22, 58, 1);
	}

	.toast-icon {
		flex-shrink: 0;
		font-size: 1rem;
		margin-top: 1px;
		color: var(--toast-color);
	}

	.toast-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.toast-title {
		font-weight: 600;
		color: #fff;
		font-size: 0.85rem;
	}

	.toast-message {
		color: #9ca3af;
		font-size: 0.78rem;
	}

	.toast-dismiss {
		background: none;
		border: none;
		color: #6b7280;
		cursor: pointer;
		font-size: 1.1rem;
		padding: 0;
		line-height: 1;
		flex-shrink: 0;
		transition: color 0.15s;
	}

	.toast-dismiss:hover {
		color: #e5e7eb;
	}

	.toast-progress {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: rgba(255, 255, 255, 0.05);
	}

	.toast-progress-bar {
		height: 100%;
		width: 100%;
		background: color-mix(in srgb, var(--toast-color) 40%, transparent);
		border-radius: 0 2px 2px 0;
		animation: shrink linear forwards;
	}

	@keyframes shrink {
		from { width: 100%; }
		to { width: 0%; }
	}
</style>
