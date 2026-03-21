import type { DebugMetrics } from '$lib/types/game';
import { CANVAS_WIDTH } from './gameEngine';

const HUD_X = CANVAS_WIDTH - 10; // Right-aligned
const HUD_Y = 8;
const LINE_HEIGHT = 16;
const FONT = '12px monospace';

/** Color-code a value: green if good, yellow if warning, red if bad */
function qualityColor(value: number, good: number, warn: number): string {
    if (value <= good) return '#4ade80'; // green
    if (value <= warn) return '#facc15'; // yellow
    return '#f87171';                     // red
}

/** Draw the debug HUD overlay on the game canvas */
export function drawDebugHud(ctx: CanvasRenderingContext2D, metrics: DebugMetrics): void {
    ctx.save();

    // Semi-transparent background
    const bgWidth = 200;
    const bgHeight = LINE_HEIGHT * 6 + 8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(HUD_X - bgWidth, HUD_Y, bgWidth, bgHeight);

    ctx.font = FONT;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    let y = HUD_Y + 4;

    // Title
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('── Debug HUD (F3) ──', HUD_X - 6, y);
    y += LINE_HEIGHT;

    // FPS
    ctx.fillStyle = qualityColor(60 - metrics.fps, 5, 15); // lower diff = better
    ctx.fillText(`FPS: ${metrics.fps}`, HUD_X - 6, y);
    y += LINE_HEIGHT;

    // Snapshot delta (should be ~16.67ms)
    ctx.fillStyle = qualityColor(Math.abs(metrics.snapshotDelta - 16.67), 5, 15);
    ctx.fillText(`Snap Δ: ${metrics.snapshotDelta}ms`, HUD_X - 6, y);
    y += LINE_HEIGHT;

    // Jitter (standard deviation of snapshot deltas)
    ctx.fillStyle = qualityColor(metrics.snapshotJitter, 3, 8);
    ctx.fillText(`Jitter: ${metrics.snapshotJitter}ms`, HUD_X - 6, y);
    y += LINE_HEIGHT;

    // RTT
    ctx.fillStyle = qualityColor(metrics.rtt, 50, 100);
    ctx.fillText(`RTT: ${metrics.rtt}ms`, HUD_X - 6, y);
    y += LINE_HEIGHT;

    // State age (how old the rendered frame is)
    ctx.fillStyle = qualityColor(metrics.stateAge, 30, 80);
    ctx.fillText(`Age: ${metrics.stateAge}ms`, HUD_X - 6, y);

    ctx.restore();
}
