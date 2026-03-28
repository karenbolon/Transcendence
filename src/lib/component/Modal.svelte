<script lang="ts">
	import { onEscape } from '$lib/utils/keyboard';
	import '$lib/styles/modal.css';

	type Props = {
		open: boolean;
		onclose: () => void;
		zIndex?: number;
		blur?: string;
		closeable?: boolean;
		children: import('svelte').Snippet;
	};

	let {
		open,
		onclose,
		zIndex = 1000,
		blur = '6px',
		closeable = true,
		children,
	}: Props = $props();

	function handleBackdropClick() {
		if (closeable) onclose();
	}
</script>

<svelte:window onkeydown={open && closeable ? onEscape(onclose) : undefined} />


{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="modal-backdrop"
		style="z-index: {zIndex}; backdrop-filter: blur({blur});"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div onclick={(e) => e.stopPropagation()}>
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: var(--color-backdrop, rgba(10, 10, 26, 0.75));
		display: flex;
		align-items: center;
		justify-content: center;
		animation: modal-fade-in var(--transition-fast, 0.15s ease);
	}
</style>
