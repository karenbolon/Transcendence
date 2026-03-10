<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';
	import Header from '$lib/component/Header.svelte';
	import Footer from '$lib/component/Footer.svelte';
	import { initI18n, detectInitialLocale, FALLBACK_LOCALE } from '$lib/i18n';
	import { _ , locale as localeStore, isLoading } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { setUserLanguage } from '$lib/utils/language_utils';

	let { children, data } = $props<{ 
		children: any; 
		data?: { 
			user?: any;
			locale?: string; 
		} 
	}>();
	
	// Always initialize with fallback to avoid hydration mismatch
	initI18n(FALLBACK_LOCALE);
	localeStore.set(FALLBACK_LOCALE);
	
	// After component mounts, set the correct language preference
	onMount(async () => {
		// Priority: 1. Server data (database), 2. localStorage, 3. fallback
		let preferredLocale = FALLBACK_LOCALE;
		
		if (data?.locale && data.locale !== FALLBACK_LOCALE) {
			// Use database preference if available 
			preferredLocale = data.locale;
		} else {
			// Fall back to localStorage if no database preference
			const stored = localStorage.getItem('locale');
			if (stored && stored !== 'null' && stored !== FALLBACK_LOCALE) {
				preferredLocale = stored;
			}
		}
		
		if (preferredLocale !== FALLBACK_LOCALE) {
			// Set language but don't save to database (just loading existing preference)
			await setUserLanguage(preferredLocale, false);
		}
	});
</script>

<svelte:head>
	{#if !$isLoading}
		<title>{$_('meta.title')}</title>
		<meta name="description" content={$_('meta.description')} />
	{:else}
		<title>PONG - ft_transcendence</title>
		<meta name="description" content="Play the classic Pong game online!" />
	{/if}
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="web">
<!-- use data? as data is optional, this says if data then... -->
	<Header user={data?.user} />
	<main>{@render children()}</main>
	<Footer user={data?.user} />
</div>