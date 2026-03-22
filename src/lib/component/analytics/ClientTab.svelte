<script lang="ts">
	import { onMount } from 'svelte';
	import * as echarts from 'echarts';

	interface BrowserRow {
		browser: string;
		count: number;
	}

	interface ViewportRow {
		resolution: string;
		count: number;
	}

	let {
		browserDist,
		viewportDist
	}: {
		browserDist: BrowserRow[];
		viewportDist: ViewportRow[];
	} = $props();

	let pieChartEl = $state<HTMLDivElement>(undefined!);
	let barChartEl = $state<HTMLDivElement>(undefined!);

	let pieChart: echarts.ECharts | undefined;
	let barChart: echarts.ECharts | undefined;

	const BROWSER_COLORS: Record<string, string> = {
		Chrome: '#4ade80',
		Firefox: '#fb923c',
		Safari: '#60a5fa',
		Edge: '#a78bfa',
		Other: '#9ca3af'
	};

	onMount(() => {
		// ── Browser pie / donut chart ──
		pieChart = echarts.init(pieChartEl, 'dark');
		pieChart.setOption({
			backgroundColor: 'transparent',
			title: { text: 'Browser Distribution', textStyle: { color: '#fff', fontSize: 14 } },
			tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
			legend: {
				orient: 'vertical',
				right: 10,
				top: 'center',
				textStyle: { color: '#9ca3af' }
			},
			series: [
				{
					type: 'pie',
					radius: ['40%', '70%'],
					center: ['40%', '55%'],
					avoidLabelOverlap: true,
					itemStyle: { borderRadius: 6, borderColor: '#1f2937', borderWidth: 2 },
					label: { show: false },
					emphasis: {
						label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#fff' }
					},
					data: browserDist.map((r) => ({
						name: r.browser,
						value: r.count,
						itemStyle: { color: BROWSER_COLORS[r.browser] ?? '#9ca3af' }
					}))
				}
			]
		});

		// ── Viewport bar chart ──
		barChart = echarts.init(barChartEl, 'dark');
		barChart.setOption({
			backgroundColor: 'transparent',
			title: {
				text: 'Top Viewport Resolutions',
				textStyle: { color: '#fff', fontSize: 14 }
			},
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			grid: { top: 50, right: 20, bottom: 30, left: 90 },
			xAxis: {
				type: 'value',
				axisLabel: { color: '#9ca3af' },
				splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
			},
			yAxis: {
				type: 'category',
				data: viewportDist.map((r) => r.resolution).reverse(),
				axisLabel: { color: '#9ca3af', fontSize: 11 }
			},
			series: [
				{
					type: 'bar',
					data: viewportDist.map((r) => r.count).reverse(),
					itemStyle: {
						color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
							{ offset: 0, color: '#ff6b9d' },
							{ offset: 1, color: '#ff9dc5' }
						]),
						borderRadius: [0, 4, 4, 0]
					},
					barMaxWidth: 24
				}
			]
		});

		function handleResize() {
			pieChart?.resize();
			barChart?.resize();
		}
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			pieChart?.dispose();
			barChart?.dispose();
		};
	});

	let totalSessions = $derived(browserDist.reduce((sum, r) => sum + r.count, 0));
</script>

{#if browserDist.length === 0 && viewportDist.length === 0}
	<div
		class="flex h-64 items-center justify-center rounded-xl border border-gray-700/50 bg-gray-800/50"
	>
		<p class="text-gray-400">No client environment data available yet. Play some games to generate data.</p>
	</div>
{:else}
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Browser pie chart -->
		<div class="rounded-xl border border-gray-700/50 bg-gray-800/50 p-6">
			<div bind:this={pieChartEl} class="h-80 w-full"></div>
		</div>

		<!-- Viewport bar chart -->
		<div class="rounded-xl border border-gray-700/50 bg-gray-800/50 p-6">
			<div bind:this={barChartEl} class="h-80 w-full"></div>
		</div>

		<!-- Browser detail table -->
		<div class="rounded-xl border border-gray-700/50 bg-gray-800/50 p-6 lg:col-span-2">
			<h3 class="mb-4 text-sm font-semibold text-white">Browser Breakdown</h3>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead>
						<tr class="border-b border-gray-700/50 text-gray-400">
							<th class="pb-3 pr-4 font-medium">Browser</th>
							<th class="pb-3 pr-4 font-medium">Sessions</th>
							<th class="pb-3 pr-4 font-medium">Share</th>
							<th class="pb-3 font-medium">Distribution</th>
						</tr>
					</thead>
					<tbody>
						{#each browserDist as row}
							{@const pct = totalSessions > 0 ? ((row.count / totalSessions) * 100).toFixed(1) : '0.0'}
							<tr class="border-b border-gray-700/30">
								<td class="py-3 pr-4 font-medium text-white">{row.browser}</td>
								<td class="py-3 pr-4 text-gray-300">{row.count}</td>
								<td class="py-3 pr-4 text-gray-300">{pct}%</td>
								<td class="py-3">
									<div class="h-2 w-full overflow-hidden rounded-full bg-gray-700">
										<div
											class="h-full rounded-full"
											style="width: {pct}%; background-color: {BROWSER_COLORS[row.browser] ?? '#9ca3af'}"
										></div>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
{/if}
