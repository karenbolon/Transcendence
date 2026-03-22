import { trace, metrics, type Tracer, type Meter } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PostgresMetricExporter } from './postgres-exporter';
import { getInstruments, type TelemetryInstruments } from './instruments';
import { logger } from '$lib/server/logger';
import { cleanupOldMetrics } from './cleanup';

let initialized = false;

export function initTelemetry(): void {
	if (initialized) return;
	initialized = true;

	const resource = resourceFromAttributes({
		[ATTR_SERVICE_NAME]: 'transcendence',
		[ATTR_SERVICE_VERSION]: '0.0.1',
	});

	// Traces
	const tracerProvider = new NodeTracerProvider({ resource });
	tracerProvider.register();

	// Metrics → PostgreSQL
	const pgExporter = new PostgresMetricExporter();
	const metricReader = new PeriodicExportingMetricReader({
		exporter: pgExporter,
		exportIntervalMillis: 30_000,
	});

	const meterProvider = new MeterProvider({
		resource,
		readers: [metricReader],
	});
	metrics.setGlobalMeterProvider(meterProvider);

	// Run cleanup once on startup, then daily
	cleanupOldMetrics(30).catch(() => {});
	setInterval(() => cleanupOldMetrics(30).catch(() => {}), 86_400_000);

	logger.info('OpenTelemetry initialized (manual instrumentation, PostgreSQL export)');
}

export function getTracer(): Tracer {
	return trace.getTracer('transcendence');
}

export function getMeter(): Meter {
	return metrics.getMeter('transcendence');
}

export { getInstruments, type TelemetryInstruments };
