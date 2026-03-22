<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import NetworkTab from '$lib/component/analytics/NetworkTab.svelte';
	import ClientTab from '$lib/component/analytics/ClientTab.svelte';
	import ServerTab from '$lib/component/analytics/ServerTab.svelte';
	import EngagementTab from '$lib/component/analytics/EngagementTab.svelte';

	let { data } = $props();

	const tabs = [
		{ id: 'network', label: 'Network Quality' },
		{ id: 'client', label: 'Client Environment' },
		{ id: 'server', label: 'Server Performance' },
		{ id: 'engagement', label: 'Player Engagement' }
	];

	const dayOptions = [7, 30] as const;

	function switchTab(tabId: string) {
		const url = new URL($page.url);
		url.searchParams.set('tab', tabId);
		goto(url.toString(), { replaceState: true });
	}

	function setDays(d: number) {
		const url = new URL($page.url);
		url.searchParams.set('days', String(d));
		goto(url.toString(), { replaceState: true });
	}
</script>

<svelte:head>
	<title>Analytics Dashboard</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Header -->
	<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-2xl font-bold text-white">Analytics Dashboard</h1>

		<!-- Time range selector -->
		<div class="flex items-center gap-2">
			<span class="text-sm text-gray-400">Range:</span>
			{#each dayOptions as d}
				<button
					class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {data.days === d
						? 'bg-[#ff6b9d] text-white'
						: 'bg-gray-800 text-gray-400 hover:text-white'}"
					onclick={() => setDays(d)}
				>
					{d}d
				</button>
			{/each}
		</div>
	</div>

	<!-- Tab navigation -->
	<div class="mb-6 flex flex-wrap gap-1 rounded-lg bg-black/30 p-1">
		{#each tabs as tab}
			<button
				class="rounded-md px-4 py-2 text-sm font-medium transition-colors {data.tab === tab.id
					? 'bg-[#ff6b9d] text-white'
					: 'text-gray-400 hover:text-white'}"
				onclick={() => switchTab(tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Tab content -->
	<div class="min-h-[500px]">
		{#if data.tab === 'network'}
			<NetworkTab networkTrend={data.networkTrend} latestRtt={data.latestRtt} />
		{:else if data.tab === 'client'}
			<ClientTab browserDist={data.browserDist} viewportDist={data.viewportDist} />
		{:else if data.tab === 'server'}
			<ServerTab
				apiLatencyTrend={data.apiLatencyTrend}
				dbQueryTrend={data.dbQueryTrend}
				socketConnections={data.socketConnections}
			/>
		{:else if data.tab === 'engagement'}
			<EngagementTab
				matchesPerDay={data.matchesPerDay}
				todayMatches={data.todayMatches}
				activeSessions={data.activeSessions}
				socketConnections={data.socketConnections}
			/>
		{/if}
	</div>
</div>
