<!--
	src/lib/component/PasswordInput.svelte
	══════════════════════════════════════════════════════════════════════════
	👁️ Password Input with Show/Hide Toggle
	══════════════════════════════════════════════════════════════════════════
	A reusable password field that toggles between ●●●●●● and plain text.

	Usage:
		<PasswordInput
			id="password"
			name="password"
			placeholder="Create a password"
			bind:value={password}
			onfocusout={() => touched.password = true}
		/>

	It works by swapping the input type between "password" and "text":
	- type="password" → browser shows dots (●●●●●●)
	- type="text"     → browser shows the actual characters
	══════════════════════════════════════════════════════════════════════════
-->

<script lang="ts">
	// Accept all the same props a normal <input> would need
	type Props = {
		id: string;
		name: string;
		placeholder?: string;
		value: string;
		required?: boolean;
		minlength?: number;
		onfocusout?: () => void;
	};

	let {
		id,
		name,
		placeholder = '',
		value = $bindable(''),
		required = false,
		minlength,
		onfocusout
	}: Props = $props();

	// Toggle state — false = hidden (dots), true = visible (text)
	let showPassword = $state(false);
</script>

<div class="relative">
	<input
		class="form-r w-full pr-10"
		type={showPassword ? 'text' : 'password'}
		{id}
		{name}
		{placeholder}
		{required}
		{minlength}
		bind:value
		{onfocusout}
	/>

	<!-- Toggle button — positioned inside the input on the right -->
	<button
		type="button"
		class="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1"
		onclick={() => showPassword = !showPassword}
		aria-label={showPassword ? 'Hide password' : 'Show password'}
		tabindex={-1}
	>
		<!--
			We use simple text/emoji instead of an icon library.
			If you add lucide-react or another icon library later,
			you can swap these for proper SVG icons.
		-->
		{#if showPassword}
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
				<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
				<line x1="1" y1="1" x2="23" y2="23"/>
			</svg>
		{:else}
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
				<circle cx="12" cy="12" r="3"/>
			</svg>
		{/if}
	</button>
</div>