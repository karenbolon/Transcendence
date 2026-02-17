<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Snippet } from 'svelte';

	let {
		class: className = 'login',
		children
	}: {
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<form method="POST" action="/logout" use:enhance>
	<button type="submit" class={className}>
		{#if children}
			{@render children()}
		{:else}
			Logout
		{/if}
	</button>
</form>