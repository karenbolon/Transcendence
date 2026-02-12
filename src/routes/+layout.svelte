<script lang="ts">
	import './otherLayout.css';
	import favicon from '$lib/assets/favicon.ico';
	import Header from '$lib/component/Header.svelte';
	import Footer from '$lib/component/Footer.svelte';
	import { onMount } from 'svelte';
	import { checkAuth } from '$lib/store/auth';
	import { initI18n, detectInitialLocale } from '$lib/i18n';
	import { locale as localeStore } from 'svelte-i18n';
    //import { any } from 'zod';

	let { children, data } = $props<{ children: any; data?: { locale?: string } }>();

	//initialise on SSR 
	const serverLocale = data?.locale;
	const ssrInitial = detectInitialLocale(serverLocale);
	initI18n(ssrInitial);
	localeStore.set(ssrInitial);

	onMount(() => {
		checkAuth();

		//prefer localStorage if user already chose somthing
		const saved = localStorage.getItem('locale');
		if (saved)
			localeStore.set(detectInitialLocale(saved));

	});

</script>

<svelte:head>
	<title>PONG - ft_transcendence</title>
	<meta name="description" content="Play the classic Pong game online! Challenge friends or AI opponents." />
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="web">
	<Header />
	<main>{@render children()}</main>
	<Footer />
</div>