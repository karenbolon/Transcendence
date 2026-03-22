import type {
	PushMetricExporter,
	ResourceMetrics,
} from '@opentelemetry/sdk-metrics';
import { ExportResultCode, type ExportResult } from '@opentelemetry/core';
import { db } from '$lib/server/db';
import { server_metrics } from '$lib/server/db/schema';
import { logger } from '$lib/server/logger';

export class PostgresMetricExporter implements PushMetricExporter {
	async export(
		metrics: ResourceMetrics,
		resultCallback: (result: ExportResult) => void
	): Promise<void> {
		try {
			const rows: Array<{
				metric_name: string;
				metric_value: number;
				metric_type: string;
				attributes: Record<string, string>;
			}> = [];

			for (const scopeMetrics of metrics.scopeMetrics) {
				for (const metric of scopeMetrics.metrics) {
					for (const dataPoint of metric.dataPoints) {
						const attrs: Record<string, string> = {};
						for (const [k, v] of Object.entries(dataPoint.attributes ?? {})) {
							attrs[k] = String(v);
						}

						const value =
							typeof dataPoint.value === 'object'
								? ((dataPoint.value as any).sum ?? 0)
								: (dataPoint.value as number);

						rows.push({
							metric_name: metric.descriptor.name,
							metric_value: value,
							metric_type: metric.dataPointType.toString(),
							attributes: attrs,
						});
					}
				}
			}

			if (rows.length > 0) {
				await db.insert(server_metrics).values(rows);
				logger.debug({ count: rows.length }, 'Flushed OTel metrics to PostgreSQL');
			}

			resultCallback({ code: ExportResultCode.SUCCESS });
		} catch (err) {
			logger.error({ err }, 'Failed to export OTel metrics to PostgreSQL');
			resultCallback({ code: ExportResultCode.FAILED });
		}
	}

	async forceFlush(): Promise<void> {}
	async shutdown(): Promise<void> {}
}
