import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import {
	getNetworkMetricsTrend,
	getBrowserDistribution,
	getViewportDistribution,
	getServerMetricsTrend,
	getMatchesPerDay,
	getActiveSessionsCount,
	getLatestAvgRtt,
	getTodayMatchCount,
	getLatestSocketConnections
} from '$lib/server/db/analytics_queries';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const days = Number(url.searchParams.get('days') ?? 30);
	const tab = url.searchParams.get('tab') ?? 'network';

	const [
		networkTrend,
		browserDist,
		viewportDist,
		apiLatencyTrend,
		dbQueryTrend,
		matchesPerDay,
		activeSessions,
		latestRtt,
		todayMatches,
		socketConnections
	] = await Promise.all([
		getNetworkMetricsTrend(days),
		getBrowserDistribution(),
		getViewportDistribution(),
		getServerMetricsTrend('api.latency_ms', Math.min(days, 7)),
		getServerMetricsTrend('db.query_ms', Math.min(days, 7)),
		getMatchesPerDay(days),
		getActiveSessionsCount(),
		getLatestAvgRtt(),
		getTodayMatchCount(),
		getLatestSocketConnections()
	]);

	return {
		tab,
		days,
		networkTrend,
		browserDist,
		viewportDist,
		apiLatencyTrend,
		dbQueryTrend,
		matchesPerDay,
		activeSessions,
		latestRtt,
		todayMatches,
		socketConnections
	};
};
