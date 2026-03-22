import { metrics } from '@opentelemetry/api';
import type { Histogram, Counter, UpDownCounter } from '@opentelemetry/api';

export interface TelemetryInstruments {
	apiLatency: Histogram;
	dbQueryDuration: Histogram;
	socketConnections: UpDownCounter;
	matchesTotal: Counter;
	matchmakingWait: Histogram;
}

let _instruments: TelemetryInstruments | undefined;

export function getInstruments(): TelemetryInstruments {
	if (!_instruments) {
		const meter = metrics.getMeter('transcendence');
		_instruments = {
			apiLatency: meter.createHistogram('api.latency_ms', {
				description: 'API endpoint latency in milliseconds',
				unit: 'ms',
			}),
			dbQueryDuration: meter.createHistogram('db.query_ms', {
				description: 'Database query duration in milliseconds',
				unit: 'ms',
			}),
			socketConnections: meter.createUpDownCounter('socket.connections', {
				description: 'Current active Socket.IO connections',
			}),
			matchesTotal: meter.createCounter('matches.total', {
				description: 'Total completed matches',
			}),
			matchmakingWait: meter.createHistogram('matchmaking.wait_ms', {
				description: 'Time spent waiting for a match in milliseconds',
				unit: 'ms',
			}),
		};
	}
	return _instruments;
}
