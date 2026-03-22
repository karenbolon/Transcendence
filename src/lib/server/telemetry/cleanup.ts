import { db } from '$lib/server/db';
import { server_metrics } from '$lib/server/db/schema';
import { lt, sql } from 'drizzle-orm';
import { logger } from '$lib/server/logger';

export async function cleanupOldMetrics(retentionDays: number = 30): Promise<number> {
	const result = await db
		.delete(server_metrics)
		.where(lt(server_metrics.recorded_at, sql`now() - make_interval(days => ${retentionDays})`))
		.returning({ id: server_metrics.id });

	if (result.length > 0) {
		logger.info({ deleted: result.length, retentionDays }, 'Cleaned up old server metrics');
	}
	return result.length;
}
