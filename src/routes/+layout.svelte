<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';
	import Header from '$lib/component/Header.svelte';
	import Footer from '$lib/component/Footer.svelte';
	import { initI18n, detectInitialLocale, FALLBACK_LOCALE } from '$lib/i18n';
	import { _, locale as localeStore, isLoading } from 'svelte-i18n';

	let { children, data } = $props<{ children: any; data?: { locale?: string } }>();
	
	// Initialize with fallback first to prevent errors
	initI18n(FALLBACK_LOCALE);
	
	// Track if we've initialized with server data to prevent loops
	let hasInitialized = false;
	
	// Reactively update locale when data changes, but respect localStorage choice
	$effect(() => {
		if (typeof window !== 'undefined' && !hasInitialized) {
			// Check localStorage first - user's choice takes priority
			const saved = localStorage.getItem('locale');
			if (saved) {
				const preferredLocale = detectInitialLocale(saved);
				localeStore.set(preferredLocale);
				hasInitialized = true;
				return; // Exit early, don't use server data
			}
		}
		
		// Use server data if available and not yet initialized
		if (data?.locale && !hasInitialized) {
			const serverLocale = detectInitialLocale(data.locale);
			localeStore.set(serverLocale);
			hasInitialized = true;
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