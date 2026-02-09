<!--
	src/lib/component/PasswordStrength.svelte
	══════════════════════════════════════════════════════════════════════════
	🔒 Password Strength Indicator — The Health Bar
	══════════════════════════════════════════════════════════════════════════
	Shows 4 bars that fill up based on password strength.

	Usage:
		<PasswordStrength password={passwordValue} />

	The component:
	- Takes a password string as a prop
	- Calculates strength using getPasswordStrength()
	- Displays 4 animated bars + a text label
	- Colors change from red → orange → yellow → green

	You can reuse this on:
	- Register page
	- Change password page
	- Settings page
	══════════════════════════════════════════════════════════════════════════
-->

<script lang="ts">
	import { getPasswordStrength } from '$lib/validation/frontend';

	// Receive the password from the parent component
	type Props = {
		password: string;
	};

	let { password }: Props = $props();

	// $derived automatically recalculates when `password` changes
	let strength = $derived(getPasswordStrength(password));
</script>

<!-- Only show when user has started typing a password -->
{#if password}
	<div class="mt-2 space-y-1">
		<!-- ═══ The Bars ═══ -->
		<div class="flex gap-1.5">
			{#each [1, 2, 3, 4] as bar}
				<div class="h-1.5 flex-1 rounded-full overflow-hidden bg-gray-700">
					<!--
						Each bar fills if the score is >= the bar number.
						Example: score = 3 → bars 1, 2, 3 are filled, bar 4 is empty.

						The width transition creates a smooth animation when
						the score changes (bars slide in/out).
					-->
					<div
						class="h-full rounded-full transition-all duration-300 ease-out {strength.barColor}"
						style="width: {strength.score >= bar ? '100%' : '0%'}"
					></div>
				</div>
			{/each}
		</div>

		<!-- ═══ The Label ═══ -->
		<div class="flex justify-between items-center">
			<p class="text-xs {strength.color} transition-colors duration-300">
				{strength.label}
			</p>
			<!-- Optional: show what's still needed -->
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