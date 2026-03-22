<script lang="ts">
	import { onMount } from 'svelte';
	import * as echarts from 'echarts';

	interface MetricRow {
		recordedAt: Date;
		value: number;
		attributes: Record<string, string> | null;
	}

	let {
		apiLatencyTrend,
		dbQueryTrend,
		socketConnections
	}: {
		apiLatencyTrend: MetricRow[];
		dbQueryTrend: MetricRow[];
		socketConnections: number;
	} = $props();

	let apiChartEl = $state<HTMLDivElement>(undefined!);
	let dbChartEl = $state<HTMLDivElement>(undefined!);
	let gaugeChartEl = $state<HTMLDivElement>(undefined!);
	let endpointChartEl = $state<HTMLDivElement>(undefined!);

	let apiChart: echarts.ECharts | undefined;
	let dbChart: echarts.ECharts | undefined;
	let gaugeChart: echarts.ECharts | undefined;
	let endpointChart: echarts.ECharts | undefined;

	function formatTime(d: Date): string {
		const date = new Date(d);
		return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
	}

	/** Group API latency rows by endpoint attribute for comparison. */
	function groupByEndpoint(rows: MetricRow[]): Record<string, { time: string; value: number }[]> {
		const groups: Record<string, { time: string; value: number }[]> = {};
		for (const row of rows) {
			const endpoint = row.attributes?.endpoint ?? row.attributes?.route ?? 'unknown';
			if (!groups[endpoint]) groups[endpoint] = [];
			groups[endpoint].push({ time: formatTime(row.recordedAt), value: row.value });
		}
		return groups;
	}

	onMount(() => {
		if (!hasApiData && !hasDbData && socketConnections === 0) return;

		// ── API latency line chart ──
		if (hasApiData) {
			apiChart = echarts.init(apiChartEl, 'dark');
			apiChart.setOption({
				backgroundColor: 'transparent',
				title: { text: 'API Latency', textStyle: { color: '#fff', fontSize: 14 } },
				tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v.toFixed(1)} ms` },
				grid: { top: 50, right: 20, bottom: 30, left: 50 },
				xAxis: {
					type: 'category',
					data: apiLatencyTrend.map((r) => formatTime(r.recordedAt)),
					axisLabel: { color: '#9ca3af', rotate: 30, fontSize: 10 }
				},
				yAxis: {
					type: 'value',
					name: 'ms',
					nameTextStyle: { color: '#9ca3af' },
					axisLabel: { color: '#9ca3af' },
					splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
				},
				series: [
					{
						type: 'line',
						data: apiLatencyTrend.map((r) => r.value),
						smooth: true,
						lineStyle: { color: '#ff6b9d', width: 2 },
						itemStyle: { color: '#ff6b9d' },
						areaStyle: {
							color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
								{ offset: 0, color: 'rgba(255,107,157,0.2)' },
								{ offset: 1, color: 'rgba(255,107,157,0)' }
							])
						}
					}
				]
			});
		}

		// ── DB query duration line chart ──
		if (hasDbData) {
			dbChart = echarts.init(dbChartEl, 'dark');
			dbChart.setOption({
				backgroundColor: 'transparent',
				title: { text: 'DB Query Duration', textStyle: { color: '#fff', fontSize: 14 } },
				tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v.toFixed(1)} ms` },
				grid: { top: 50, right: 20, bottom: 30, left: 50 },
				xAxis: {
					type: 'category',
					data: dbQueryTrend.map((r) => formatTime(r.recordedAt)),
					axisLabel: { color: '#9ca3af', rotate: 30, fontSize: 10 }
				},
				yAxis: {
					type: 'value',
					name: 'ms',
					nameTextStyle: { color: '#9ca3af' },
					axisLabel: { color: '#9ca3af' },
					splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
				},
				series: [
					{
						type: 'line',
						data: dbQueryTrend.map((r) => r.value),
						smooth: true,
						lineStyle: { color: '#60a5fa', width: 2 },
						itemStyle: { color: '#60a5fa' },
						areaStyle: {
							color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
								{ offset: 0, color: 'rgba(96,165,250,0.2)' },
								{ offset: 1, color: 'rgba(96,165,250,0)' }
							])
						}
					}
				]
			});
		}

		// ── Socket connections gauge ──
		gaugeChart = echarts.init(gaugeChartEl, 'dark');
		gaugeChart.setOption({
			backgroundColor: 'transparent',
			series: [
				{
					type: 'gauge',
					startAngle: 200,
					endAngle: -20,
					min: 0,
					max: Math.max(socketConnections * 2, 50),
					splitNumber: 5,
					axisLine: {
						lineStyle: {
							width: 20,
							color: [
								[0.4, '#4ade80'],
								[0.7, '#facc15'],
								[1, '#f87171']
							]
						}
					},
					pointer: { itemStyle: { color: '#ff6b9d' }, width: 4 },
					axisTick: { distance: -20, length: 6, lineStyle: { color: '#999', width: 1 } },
					splitLine: {
						distance: -24,
						length: 14,
						lineStyle: { color: '#999', width: 2 }
					},
					axisLabel: { color: '#9ca3af', distance: 30, fontSize: 11 },
					detail: {
						valueAnimation: true,
						formatter: '{value}',
						color: '#fff',
						fontSize: 22,
						offsetCenter: [0, '70%']
					},
					title: { offsetCenter: [0, '90%'], color: '#9ca3af', fontSize: 12 },
					data: [{ value: socketConnections, name: 'Active Connections' }]
				}
			]
		});

		// ── Endpoint comparison bar chart (if we have endpoint attributes) ──
		const endpointGroups = groupByEndpoint(apiLatencyTrend);
		const endpoints = Object.keys(endpointGroups).filter((e) => e !== 'unknown');

		if (endpoints.length > 1) {
			endpointChart = echarts.init(endpointChartEl, 'dark');
			const avgByEndpoint = endpoints.map((ep) => {
				const values = endpointGroups[ep];
				const avg = values.reduce((s, v) => s + v.value, 0) / values.length;
				return { endpoint: ep, avg: Math.round(avg * 10) / 10 };
			});
			avgByEndpoint.sort((a, b) => b.avg - a.avg);

			endpointChart.setOption({
				backgroundColor: 'transparent',
				title: {
					text: 'Avg Latency by Endpoint',
					textStyle: { color: '#fff', fontSize: 14 }
				},
				tooltip: {
					trigger: 'axis',
					axisPointer: { type: 'shadow' },
					valueFormatter: (v: number) => `${v} ms`
				},
				grid: { top: 50, right: 20, bottom: 30, left: 120 },
				xAxis: {
					type: 'value',
					name: 'ms',
					axisLabel: { color: '#9ca3af' },
					splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
				},
				yAxis: {
					type: 'category',
					data: avgByEndpoint.map((r) => r.endpoint),
					axisLabel: { color: '#9ca3af', fontSize: 10 }
				},
				series: [
					{
						type: 'bar',
						data: avgByEndpoint.map((r) => r.avg),
						itemStyle: {
							color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
								{ offset: 0, color: '#a78bfa' },
								{ offset: 1, color: '#c4b5fd' }
							]),
							borderRadius: [0, 4, 4, 0]
						},
						barMaxWidth: 20
					}
				]
			});
		}

		function handleResize() {
			apiChart?.resize();
			dbChart?.resize();
			gaugeChart?.resize();
			endpointChart?.resize();
		}
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			apiChart?.dispose();
			dbChart?.dispose();
			gaugeChart?.dispose();
			endpointChart?.dispose();
		};
	});

	let hasApiData = $derived(apiLatencyTrend.length > 0);
	let hasDbData = $derived(dbQueryTrend.length > 0);
	let hasEndpoints = $derived(() => {
		const groups = groupByEndpoint(apiLatencyTrend);
		return Object.keys(groups).filter((e) => e !== 'unknown').length > 1;
	});
</script>

{#if !hasApiData && !hasDbData && socketConnections === 0}
	<div
		class="flex h-64 items-center justify-center rounded-xl border border-gray-700/50 bg-gray-800/50"
	>
		<p class="text-gray-400">No server metrics data available yet. The system will begin recording metrics automatically.</p>
	</div>
{:else}
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- API latency chart -->
		<div class="rounded-xl border border-gray-700/50 bg-gray-800/50 p-6">
			{#if hasApiData}
				<div bind:this={apiChartEl} class="h-80 w-full"></div>
			{:else}
				<div class="flex h-80 items-center justify-center">
					<p class="text-gray-500">No API latency data</p>
				</div>
			{/if}
		</div>

		<!-- DB query chart -->
		<div class="rounded-xl border border-gray-700/50 bg-gray-800/50 p-6">
			{#if hasDbData}
				<div bind:this={dbChartEl} class="h-80 w-full"></div>
			{:else}
				<div class="flex h-80 items-center justify-center">
					<p class="text-gray-500">No DB query data</p>
				</div>
			{/if}
		</div>

		<!-- Socket connections gauge -->
		<div class="flex flex-col items-center rounded-xl border border-gray-700/50 bg-gray-800/50 p-6">
			<div bind:this={gaugeChartEl} class="h-72 w-full max-w-md"></div>
		</div>

		<!-- Endpoint comparison (conditionally shown) -->
		<div class="rounded-xl border border-gray-700/50 bg-gray-800/50 p-6">
			{#if hasApiData}
				<div bind:this={endpointChartEl} class="h-72 w-full"></div>
				{#if !hasEndpoints}
					<div class="flex h-72 items-center justify-center">
						<p class="text-sm text-gray-500">
							Endpoint comparison will appear when multiple routes are recorded
						</p>
					</div>
				{/if}
			{:else}
				<div class="flex h-72 items-center justify-center">
					<p class="text-gray-500">No endpoint data</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
