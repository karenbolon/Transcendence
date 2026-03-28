import type { GameStateSnapshot } from '$lib/types/game';
import { CANVAS_WIDTH, CANVAS_HEIGHT, BALL_RADIUS } from '$lib/game/gameEngine';

/** Linear interpolation between two numbers. */
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/** Clamp a value to [min, max]. */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Interpolate between two game state snapshots.
 *
 * Numeric position/rotation fields are lerped.
 * Discrete fields (phase, scores, winner, etc.) are taken from `to`.
 * If a phase transition or score change occurred, no interpolation
 * is applied — the `to` snapshot is returned as-is.
 */
export function interpolateSnapshots(
	from: GameStateSnapshot,
	to: GameStateSnapshot,
	t: number,
): GameStateSnapshot {
	const clamped = clamp(t, 0, 1);

	// Don't interpolate across phase boundaries (ball resets, etc.)
	if (from.phase !== to.phase) {
		return to;
	}

	// Don't interpolate across score changes (ball resets to center)
	if (from.score1 !== to.score1 || from.score2 !== to.score2) {
		return to;
	}

	return {
		// Discrete fields: always from the newer snapshot
		phase: to.phase,
		score1: to.score1,
		score2: to.score2,
		countdownDisplay: to.countdownDisplay,
		winner: to.winner,
		scoreFlash: to.scoreFlash,
		scoreFlashTimer: to.scoreFlashTimer,
		timestamp: to.timestamp,
		ballVX: to.ballVX,
		ballVY: to.ballVY,
		powerUpItem: to.powerUpItem,
		activeEffects: to.activeEffects,
		lastBallHitter: to.lastBallHitter,

		// Interpolated fields: positions and rotation
		paddle1Y: lerp(from.paddle1Y, to.paddle1Y, clamped),
		paddle2Y: lerp(from.paddle2Y, to.paddle2Y, clamped),
		ballX: lerp(from.ballX, to.ballX, clamped),
		ballY: lerp(from.ballY, to.ballY, clamped),
		ballSpin: lerp(from.ballSpin, to.ballSpin, clamped),
		ballRotation: lerp(from.ballRotation, to.ballRotation, clamped),
	};
}

// Max time to extrapolate forward (3 server ticks = ~50ms).
// Beyond this, something is genuinely wrong — don't overshoot.
const MAX_EXTRAPOLATION_S = 0.05;

/**
 * Project a snapshot forward by `dt` seconds using the ball's last known velocity.
 * Used when the client has consumed past `currSnapshot` and the next packet hasn't
 * arrived yet — keeps the ball moving instead of freezing.
 *
 * Only extrapolates ball position/rotation. Paddles are left at their last known
 * position (we don't have paddle velocity in the snapshot, and paddle drift is
 * much less visually jarring than a frozen ball).
 *
 * Includes naïve wall clamping so the ball doesn't visibly exit the canvas.
 */
export function extrapolateSnapshot(
	snapshot: GameStateSnapshot,
	dt: number,
): GameStateSnapshot {
	const safeDt = Math.min(dt, MAX_EXTRAPOLATION_S);

	let ballX = snapshot.ballX + snapshot.ballVX * safeDt;
	let ballY = snapshot.ballY + snapshot.ballVY * safeDt;

	// Naïve wall clamp — prevents the ball visually leaving the canvas
	// during extrapolation. The server will correct on the next snapshot.
	ballX = Math.max(BALL_RADIUS, Math.min(CANVAS_WIDTH  - BALL_RADIUS, ballX));
	ballY = Math.max(BALL_RADIUS, Math.min(CANVAS_HEIGHT - BALL_RADIUS, ballY));

	// Approximate rotation: continue spinning at the same rate as the engine does
	// (engine applies: ballRotation += ballSpin * 15 * dt)
	const ballRotation = snapshot.ballRotation + snapshot.ballSpin * 15 * safeDt;

	return {
		...snapshot,
		ballX,
		ballY,
		ballRotation,
	};
}
