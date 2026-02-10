<script lang="ts">
	import { locale } from 'svelte-i18n';

	const options = [
		{ code: 'en', label: 'English' },
		{ code: 'de', label: 'Deutsch' },
		{ code: 'es', label: 'Español' },
		{ code: 'fr', label: 'Français' },
	] as const;

	type Lang = (typeof options)[number]['code'];

	function change(e: Event) {
		const lang = (e.currentTarget as HTMLSelectElement).value as Lang;
		
		locale.set(lang);
		localStorage.setItem('locale', lang);
		//persist for SSR + refreshes
		document.cookie = `locale=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
		
	}
</script>

<label class="flex items-center gap-2 text-sm">
	<span class="sr-only">Language</span>

	<select 
	class="login px-4 py-2 pr-8 appearance-none curor-pointer" 
	on:change={change} value={$locale ?? 'en'}>
		{#each options as l}
		<option value={l.code}>{l.label}</option>
		{/each}
	</select>
	<span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs">
		▾
	</span>
</label>