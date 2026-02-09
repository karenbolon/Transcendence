<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';
	import Header from '$lib/component/Header.svelte';
	import Footer from '$lib/component/Footer.svelte';

	let { children, data } = $props();
</script>

<svelte:head>
	<title>PONG - ft_transcendence</title>
	<meta name="description" content="Play the classic Pong game online! Challenge friends or AI opponents." />
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="web">
	<Header user={data.user} />
	<main>{@render children()}</main>
	<Footer />
</div>