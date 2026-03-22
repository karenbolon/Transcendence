<script lang="ts">
	import { onMount } from 'svelte';
	import * as echarts from 'echarts';

	interface MatchRow {
		date: string;
		count: number;
	}

	let {
		matchesPerDay,
		todayMatches,
		activeSessions,
		socketConnections
	}: {
		matchesPerDay: MatchRow[];
		todayMatches: number;
		activeSessions: number;
		socketConnections: number;
	} = $props();

	let areaChartEl = $state<HTMLDivElement>(undefined!);
	let areaChart: echarts.ECharts | undefined;

	function formatDate(raw: string): string {
		const d = new Date(raw);
		return `${d.getMonth() + 1}/${d.getDate()}`;
	}

	let stats = $derived([
		{ label: "Today's Matches", value: todayMatches, color: '#ff6b9d' },
		{ label: 'Active Sessions', value: activeSessions, color: '#4ade80' },
		{ label: 'Socket Connections', value: socketConnections, color: '#60a5fa' }
	]);

	onMount(() => {
		if (matchesPerDay.length === 0) return;

		areaChart = echarts.init(areaChartEl, 'dark');
		areaChart.setOption({
			backgroundColor: 'transparent',
			title: { text: 'Matches Per Day', textStyle: { color: '#fff', fontSize: 14 } },
			tooltip: { trigger: 'axis' },
			grid: { top: 50, right: 20, bottom: 30, left: 50 },
			xAxis: {
				type: 'category',
				data: matchesPerDay.map((r) => formatDate(r.date)),
				axisLabel: { color: '#9ca3af' },
				boundaryGap: false
			},
			yAxis: {
				type: 'value',
				minInterval: 1,
				axisLabel: { color: '#9ca3af' },
				splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
			},
			series: [
				{
					type: 'line',
					data: matchesPerDay.map((r) => r.count),
					smooth: true,
					lineStyle: { color: '#ff6b9d', width: 2 },
					itemStyle: { color: '#ff6b9d' },
					areaStyle: {
						color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
							{ offset: 0, color: 'rgba(255,107,157,0.35)' },
							{ offset: 1, color: 'rgba(255,107,157,0)' }
						])
					}
				}
			]
		});

		function handleResize() {
			areaChart?.resize();
		}
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			areaChart?.dispose();
		};
	});
</script>

<!-- Stat cards -->
<div class="mb-6 grid gap-4 sm:grid-cols-3">
	{#each stats as stat}
		<div class="rounded-xl border border-gray-700/50 bg-gray-800/50 p-6">
			<p class="text-sm text-gray-400">{stat.label}</p>
			<p class="mt-1 text-3xl font-bold" style="color: {stat.color}">{stat.value}</p>
		</div>
	{/each}
</div>

<!-- Matches area chart -->
{#if matchesPerDay.length === 0}
	<div
		class="flex h-64 items-center justify-center rounded-xl border border-gray-700/50 bg-gray-800/50"
	>
		<p class="text-gray-400">No match data available yet. Play some games to generate data.</p>
	</div>
{:else}
	<div class="rounded-xl border border-gray-700/50 bg-gray-800/50 p-6">
		<div bind:this={areaChartEl} class="h-96 w-full"></div>
	</div>
{/if}
