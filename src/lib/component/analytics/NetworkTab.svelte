<script lang="ts">
	import { onMount } from 'svelte';
	import * as echarts from 'echarts';

	interface NetworkRow {
		date: string;
		avgRtt: number;
		p95Rtt: number;
		avgJitter: number;
		p95Jitter: number;
	}

	let {
		networkTrend,
		latestRtt
	}: {
		networkTrend: NetworkRow[];
		latestRtt: number;
	} = $props();

	let rttChartEl = $state<HTMLDivElement>(undefined!);
	let jitterChartEl = $state<HTMLDivElement>(undefined!);
	let gaugeChartEl = $state<HTMLDivElement>(undefined!);

	let rttChart: echarts.ECharts | undefined;
	let jitterChart: echarts.ECharts | undefined;
	let gaugeChart: echarts.ECharts | undefined;

	function formatDate(raw: string): string {
		const d = new Date(raw);
		return `${d.getMonth() + 1}/${d.getDate()}`;
	}

	onMount(() => {
		const dates = networkTrend.map((r) => formatDate(r.date));

		// ── RTT line chart ──
		rttChart = echarts.init(rttChartEl, 'dark');
		rttChart.setOption({
			backgroundColor: 'transparent',
			title: { text: 'Round-Trip Time (RTT)', textStyle: { color: '#fff', fontSize: 14 } },
			tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v} ms` },
			legend: { data: ['Avg RTT', 'p95 RTT'], textStyle: { color: '#9ca3af' }, bottom: 0 },
			grid: { top: 50, right: 20, bottom: 40, left: 50 },
			xAxis: { type: 'category', data: dates, axisLabel: { color: '#9ca3af' } },
			yAxis: {
				type: 'value',
				name: 'ms',
				nameTextStyle: { color: '#9ca3af' },
				axisLabel: { color: '#9ca3af' },
				splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
			},
			series: [
				{
					name: 'Avg RTT',
					type: 'line',
					data: networkTrend.map((r) => r.avgRtt),
					smooth: true,
					lineStyle: { color: '#ff6b9d', width: 2 },
					itemStyle: { color: '#ff6b9d' },
					areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{ offset: 0, color: 'rgba(255,107,157,0.25)' },
						{ offset: 1, color: 'rgba(255,107,157,0)' }
					]) }
				},
				{
					name: 'p95 RTT',
					type: 'line',
					data: networkTrend.map((r) => r.p95Rtt),
					smooth: true,
					lineStyle: { color: '#ff9dc5', width: 2, type: 'dashed' },
					itemStyle: { color: '#ff9dc5' }
				}
			]
		});

		// ── Jitter line chart ──
		jitterChart = echarts.init(jitterChartEl, 'dark');
		jitterChart.setOption({
			backgroundColor: 'transparent',
			title: { text: 'Jitter', textStyle: { color: '#fff', fontSize: 14 } },
			tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v} ms` },
			legend: {
				data: ['Avg Jitter', 'p95 Jitter'],
				textStyle: { color: '#9ca3af' },
				bottom: 0
			},
			grid: { top: 50, right: 20, bottom: 40, left: 50 },
			xAxis: { type: 'category', data: dates, axisLabel: { color: '#9ca3af' } },
			yAxis: {
				type: 'value',
				name: 'ms',
				nameTextStyle: { color: '#9ca3af' },
				axisLabel: { color: '#9ca3af' },
				splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
			},
			series: [
				{
					name: 'Avg Jitter',
					type: 'line',
					data: networkTrend.map((r) => r.avgJitter),
					smooth: true,
					lineStyle: { color: '#60a5fa', width: 2 },
					itemStyle: { color: '#60a5fa' },
					areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{ offset: 0, color: 'rgba(96,165,250,0.25)' },
						{ offset: 1, color: 'rgba(96,165,250,0)' }
					]) }
				},
				{
					name: 'p95 Jitter',
					type: 'line',
					data: networkTrend.map((r) => r.p95Jitter),
					smooth: true,
					lineStyle: { color: '#93c5fd', width: 2, type: 'dashed' },
					itemStyle: { color: '#93c5fd' }
				}
			]
		});

		// ── RTT gauge ──
		gaugeChart = echarts.init(gaugeChartEl, 'dark');
		gaugeChart.setOption({
			backgroundColor: 'transparent',
			series: [
				{
					type: 'gauge',
					startAngle: 200,
					endAngle: -20,
					min: 0,
					max: 200,
					splitNumber: 4,
					axisLine: {
						lineStyle: {
							width: 20,
							color: [
								[0.25, '#4ade80'],
								[0.5, '#facc15'],
								[1, '#f87171']
							]
						}
					},
					pointer: { itemStyle: { color: '#ff6b9d' }, width: 4 },
					axisTick: { distance: -20, length: 6, lineStyle: { color: '#999', width: 1 } },
					splitLine: { distance: -24, length: 14, lineStyle: { color: '#999', width: 2 } },
					axisLabel: { color: '#9ca3af', distance: 30, fontSize: 11 },
					detail: {
						valueAnimation: true,
						formatter: '{value} ms',
						color: '#fff',
						fontSize: 18,
						offsetCenter: [0, '70%']
					},
					title: {
						offsetCenter: [0, '90%'],
						color: '#9ca3af',
						fontSize: 12
					},
					data: [{ value: latestRtt, name: 'Avg RTT (24h)' }]
				}
			]
		});

		function handleResize() {
			rttChart?.resize();
			jitterChart?.resize();
			gaugeChart?.resize();
		}
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			rttChart?.dispose();
			jitterChart?.dispose();
			gaugeChart?.dispose();
		};
	});
</script>

{#if networkTrend.length === 0}
	<div
		class="flex h-64 items-center justify-center rounded-xl border border-gray-700/50 bg-gray-800/50"
	>
		<p class="text-gray-400">No network metrics data available yet. Play some games to generate data.</p>
	</div>
{:else}
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- RTT chart -->
		<div class="rounded-xl border border-gray-700/50 bg-gray-800/50 p-6">
			<div bind:this={rttChartEl} class="h-80 w-full"></div>
		</div>

		<!-- Jitter chart -->
		<div class="rounded-xl border border-gray-700/50 bg-gray-800/50 p-6">
			<div bind:this={jitterChartEl} class="h-80 w-full"></div>
		</div>

		<!-- Gauge -->
		<div
			class="flex flex-col items-center rounded-xl border border-gray-700/50 bg-gray-800/50 p-6 lg:col-span-2"
		>
			<div bind:this={gaugeChartEl} class="h-72 w-full max-w-md"></div>
			<p class="mt-2 text-sm text-gray-400">
				{#if latestRtt < 50}
					Excellent latency
				{:else if latestRtt < 100}
					Acceptable latency
				{:else}
					High latency -- players may notice lag
				{/if}
			</p>
		</div>
	</div>
{/if}
