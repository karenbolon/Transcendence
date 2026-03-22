import type { DebugMetrics } from '$lib/types/game';

const JITTER_SAMPLE_SIZE = 60; // ~1 second of samples at 60fps
const PING_INTERVAL = 2000;    // Send ping every 2 seconds

export interface MetricsReport {
    avgRtt: number;
    p95Rtt: number;
    avgJitter: number;
    p95Jitter: number;
    avgFps: number;
    minFps: number;
    browser: string;
    viewportWidth: number;
    viewportHeight: number;
}

function avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}

function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return Math.round(sorted[Math.max(0, idx)] * 10) / 10;
}

export class MetricsCollector {
    // FPS tracking
    private frameCount = 0;
    private lastFpsUpdate = 0;
    private currentFps = 0;

    // Snapshot arrival tracking
    private lastSnapshotArrival = 0;
    private snapshotDeltas: number[] = [];
    private lastSnapshotDelta = 0;

    // RTT tracking
    private currentRtt = 0;
    private lastPingSent = 0;

    // State age
    private lastStateAge = 0;

    // Summary sample arrays
    private rttSamples: number[] = [];
    private fpsSamples: number[] = [];

    // Frame-by-frame recording for export
    private recordings: string[] = [];

    /** Call this every render frame (inside requestAnimationFrame) */
    recordFrame(now: number): void {
        this.frameCount++;
        if (now - this.lastFpsUpdate >= 1000) {
            this.currentFps = this.frameCount;
            if (this.currentFps > 0) this.fpsSamples.push(this.currentFps);
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }
        this.recordings.push(JSON.stringify({
            t: Date.now(),
            fps: this.currentFps,
            delta: Math.round(this.lastSnapshotDelta),
            jitter: Math.round(this.calculateJitter()),
            rtt: this.currentRtt,
            age: this.lastStateAge,
        }));
    }

    /** Call this when a game:state snapshot arrives */
    recordSnapshot(serverTimestamp: number): void {
        const now = performance.now();
        if (this.lastSnapshotArrival > 0) {
            const delta = now - this.lastSnapshotArrival;
            this.lastSnapshotDelta = delta;
            this.snapshotDeltas.push(delta);
            if (this.snapshotDeltas.length > JITTER_SAMPLE_SIZE) {
                this.snapshotDeltas.shift();
            }
        }
        this.lastSnapshotArrival = now;
        this.lastStateAge = Date.now() - serverTimestamp;
    }

    /** Call this to check if a ping should be sent. Returns true if it's time. */
    shouldPing(now: number): boolean {
        if (now - this.lastPingSent >= PING_INTERVAL) {
            this.lastPingSent = now;
            return true;
        }
        return false;
    }

    /** Call this when game:pong arrives */
    recordPong(clientTimestamp: number): void {
        this.currentRtt = Date.now() - clientTimestamp;
        this.rttSamples.push(this.currentRtt);
    }

    /** Get current metrics snapshot for HUD rendering */
    getMetrics(): DebugMetrics {
        return {
            fps: this.currentFps,
            snapshotDelta: Math.round(this.lastSnapshotDelta),
            snapshotJitter: Math.round(this.calculateJitter()),
            rtt: this.currentRtt,
            stateAge: this.lastStateAge,
        };
    }

    private calculateJitter(): number {
        if (this.snapshotDeltas.length < 2) return 0;
        const mean = this.snapshotDeltas.reduce((a, b) => a + b, 0) / this.snapshotDeltas.length;
        const variance = this.snapshotDeltas.reduce((sum, d) => sum + (d - mean) ** 2, 0) / this.snapshotDeltas.length;
        return Math.sqrt(variance);
    }

    /** Get a summary report of all collected metrics */
    getSummary(): MetricsReport {
        const sortedRtt = [...this.rttSamples].sort((a, b) => a - b);
        const sortedJitter = [...this.snapshotDeltas].sort((a, b) => a - b);
        const sortedFps = [...this.fpsSamples].sort((a, b) => a - b);

        return {
            avgRtt: avg(sortedRtt),
            p95Rtt: percentile(sortedRtt, 95),
            avgJitter: avg(sortedJitter),
            p95Jitter: percentile(sortedJitter, 95),
            avgFps: avg(sortedFps),
            minFps: sortedFps[0] ?? 0,
            browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
            viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
        };
    }

    /** Download all recorded frames as a JSONL file */
    downloadRecording(): void {
        if (this.recordings.length === 0) return;
        const blob = new Blob([this.recordings.join('\n')], { type: 'application/jsonl' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pong-metrics-${new Date().toISOString().replace(/:/g, '-')}.jsonl`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /** Reset all metrics (call on cleanup) */
    reset(): void {
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.currentFps = 0;
        this.lastSnapshotArrival = 0;
        this.snapshotDeltas = [];
        this.lastSnapshotDelta = 0;
        this.currentRtt = 0;
        this.lastPingSent = 0;
        this.lastStateAge = 0;
        this.rttSamples = [];
        this.fpsSamples = [];
        this.recordings = [];
    }
}
