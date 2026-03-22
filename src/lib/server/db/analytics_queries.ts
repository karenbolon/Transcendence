import { db } from '$lib/server/db';
import { game_metrics, server_metrics, games, sessions } from '$lib/server/db/schema';
import { sql, desc, gte, eq, and } from 'drizzle-orm';

/** Network Quality: daily avg/p95 RTT and jitter over the given window. */
export async function getNetworkMetricsTrend(days: number = 30) {
	return db
		.select({
			date: sql<string>`date_trunc('day', ${game_metrics.created_at})::text`.as('date'),
			avgRtt: sql<number>`round(avg(${game_metrics.avg_rtt})::numeric, 1)`.as('avg_rtt'),
			p95Rtt: sql<number>`round(percentile_cont(0.95) within group (order by ${game_metrics.p95_rtt})::numeric, 1)`.as(
				'p95_rtt'
			),
			avgJitter: sql<number>`round(avg(${game_metrics.avg_jitter})::numeric, 1)`.as(
				'avg_jitter'
			),
			p95Jitter: sql<number>`round(percentile_cont(0.95) within group (order by ${game_metrics.p95_jitter})::numeric, 1)`.as(
				'p95_jitter'
			)
		})
		.from(game_metrics)
		.where(gte(game_metrics.created_at, sql`now() - make_interval(days => ${days})`))
		.groupBy(sql`date_trunc('day', ${game_metrics.created_at})`)
		.orderBy(sql`date_trunc('day', ${game_metrics.created_at})`);
}

/** Browser distribution (grouped into Chrome / Firefox / Safari / Edge / Other). */
export async function getBrowserDistribution() {
	return db
		.select({
			browser: sql<string>`
				CASE
					WHEN ${game_metrics.browser} LIKE '%Chrome%' AND ${game_metrics.browser} NOT LIKE '%Edg%' THEN 'Chrome'
					WHEN ${game_metrics.browser} LIKE '%Firefox%' THEN 'Firefox'
					WHEN ${game_metrics.browser} LIKE '%Safari%' AND ${game_metrics.browser} NOT LIKE '%Chrome%' THEN 'Safari'
					WHEN ${game_metrics.browser} LIKE '%Edg%' THEN 'Edge'
					ELSE 'Other'
				END
			`.as('browser'),
			count: sql<number>`count(*)::int`.as('count')
		})
		.from(game_metrics)
		.groupBy(sql`1`);
}

/** Top 10 viewport resolutions by frequency. */
export async function getViewportDistribution() {
	return db
		.select({
			resolution: sql<string>`${game_metrics.viewport_width} || 'x' || ${game_metrics.viewport_height}`.as(
				'resolution'
			),
			count: sql<number>`count(*)::int`.as('count')
		})
		.from(game_metrics)
		.groupBy(game_metrics.viewport_width, game_metrics.viewport_height)
		.orderBy(desc(sql`count(*)`))
		.limit(10);
}

/** Server metrics trend for a specific metric name. */
export async function getServerMetricsTrend(metricName: string, days: number = 7) {
	return db
		.select({
			recordedAt: server_metrics.recorded_at,
			value: server_metrics.metric_value,
			attributes: server_metrics.attributes
		})
		.from(server_metrics)
		.where(
			and(
				eq(server_metrics.metric_name, metricName),
				gte(server_metrics.recorded_at, sql`now() - make_interval(days => ${days})`)
			)
		)
		.orderBy(server_metrics.recorded_at);
}

/** Matches per day over the given window. */
export async function getMatchesPerDay(days: number = 30) {
	return db
		.select({
			date: sql<string>`date_trunc('day', ${games.created_at})::text`.as('date'),
			count: sql<number>`count(*)::int`.as('count')
		})
		.from(games)
		.where(gte(games.created_at, sql`now() - make_interval(days => ${days})`))
		.groupBy(sql`date_trunc('day', ${games.created_at})`)
		.orderBy(sql`date_trunc('day', ${games.created_at})`);
}

/** Current active sessions (not expired). */
export async function getActiveSessionsCount() {
	const result = await db
		.select({ count: sql<number>`count(*)::int`.as('count') })
		.from(sessions)
		.where(gte(sessions.expiresAt, sql`now()`));
	return result[0]?.count ?? 0;
}

/** Average RTT from the last 24 hours (for the gauge). */
export async function getLatestAvgRtt() {
	const result = await db
		.select({
			avgRtt: sql<number>`round(avg(${game_metrics.avg_rtt})::numeric, 1)`.as('avg_rtt')
		})
		.from(game_metrics)
		.where(gte(game_metrics.created_at, sql`now() - interval '24 hours'`));
	return result[0]?.avgRtt ?? 0;
}

/** Total matches played today. */
export async function getTodayMatchCount() {
	const result = await db
		.select({ count: sql<number>`count(*)::int`.as('count') })
		.from(games)
		.where(gte(games.created_at, sql`date_trunc('day', now())`));
	return result[0]?.count ?? 0;
}

/** Latest recorded socket connection count from server_metrics. */
export async function getLatestSocketConnections() {
	const result = await db
		.select({ value: server_metrics.metric_value })
		.from(server_metrics)
		.where(eq(server_metrics.metric_name, 'socket.connections'))
		.orderBy(desc(server_metrics.recorded_at))
		.limit(1);
	return result[0]?.value ?? 0;
}
