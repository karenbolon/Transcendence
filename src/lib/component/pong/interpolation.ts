import type { GameStateSnapshot } from '$lib/types/game';

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

		// Interpolated fields: positions and rotation
		paddle1Y: lerp(from.paddle1Y, to.paddle1Y, clamped),
		paddle2Y: lerp(from.paddle2Y, to.paddle2Y, clamped),
		ballX: lerp(from.ballX, to.ballX, clamped),
		ballY: lerp(from.ballY, to.ballY, clamped),
		ballSpin: lerp(from.ballSpin, to.ballSpin, clamped),
		ballRotation: lerp(from.ballRotation, to.ballRotation, clamped),
	};
}
