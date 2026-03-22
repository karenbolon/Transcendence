import { getInstruments } from './instruments';

export function recordApiLatency(endpoint: string, method: string, startMs: number): void {
	const duration = performance.now() - startMs;
	getInstruments().apiLatency.record(duration, {
		endpoint,
		method,
	});
}
