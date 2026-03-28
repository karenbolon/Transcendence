<script lang="ts">
	import { getPasswordStrength } from '$lib/validation/frontend';
	type Props = {
		password: string;
	};

	let { password }: Props = $props();
	let strength = $derived(getPasswordStrength(password));
</script>

{#if password}
	<div class="mt-2 space-y-1">
		<div class="flex gap-1.5">
			{#each [1, 2, 3, 4] as bar}
				<div class="h-1.5 flex-1 rounded-full overflow-hidden bg-gray-700">
					<div
						class="h-full rounded-full transition-all duration-300 ease-out {strength.barColor}"
						style="width: {strength.score >= bar ? '100%' : '0%'}"
					></div>
				</div>
			{/each}
		</div>

		<div class="flex justify-between items-center">
			<p class="text-xs {strength.color} transition-colors duration-300">
				{strength.label}
			</p>
			{#if strength.score < 4}
				<p class="text-xs text-gray-500">
					{#if strength.score <= 2}
						Add uppercase, lowercase & numbers
					{:else}
						Try 12+ chars or special characters (!@#$)
					{/if}
				</p>
			{/if}
		</div>
	</div>
{/if}