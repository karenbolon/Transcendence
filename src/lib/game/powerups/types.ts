/**
 * Power-Up Type Definitions and Configuration
 *
 * All types, interfaces, and constants for the power-up system.
 * No logic here — just data.
 */

// NOTE: No imports from gameEngine to avoid circular dependency.
// Canvas dimensions duplicated here — keep in sync with gameEngine.ts.
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 560;

// ── Power-Up Types ──────────────────────────────────────────

export type PowerUpType =
	| 'bigPaddle'
	| 'smallPaddle'
	| 'speedBall'
	| 'slowBall'
	| 'reverseControls'
	| 'freeze'
	| 'invisibleBall'
	| 'wall'
	| 'magnet';

export interface PowerUpItem {
	type: PowerUpType;
	x: number;
	y: number;
	radius: number;
	active: boolean;
}

export interface ActiveEffect {
	type: PowerUpType;
	target: 'player1' | 'player2';
	remainingTime: number;
	duration: number;
}

// ── Configuration ───────────────────────────────────────────

// ── How power-ups work ──────────────────────────────────────
// positive: true  → effect helps the COLLECTOR (bar shows under collector's score)
// positive: false → effect hurts the OPPONENT (bar shows under opponent's score)
//
// HUD: Each active effect shows as a colored bar with an icon under the
// affected player's score. The bar shrinks as the timer counts down.
// Player 1's effects appear under the LEFT score, Player 2's under the RIGHT.
//
// Collector = the player who last hit the ball before it touched the power-up.

export const POWERUP_CONFIG: Partial<Record<PowerUpType, {
	duration: number;
	positive: boolean;
	spawnWeight: number;
}>> = {
	bigPaddle:       { duration: 10, positive: true,  spawnWeight: 3 },
	smallPaddle:     { duration: 10, positive: false, spawnWeight: 3 },
	reverseControls: { duration: 8,  positive: false, spawnWeight: 1 },
	freeze:          { duration: 3,  positive: false, spawnWeight: 1 },
	invisibleBall:   { duration: 8,  positive: false, spawnWeight: 1 },
	wall:            { duration: 10, positive: true,  spawnWeight: 1 },
	magnet:          { duration: 8,  positive: true,  spawnWeight: 1 },

	speedBall:       { duration: 8,  positive: false, spawnWeight: 2 },
	slowBall:        { duration: 8,  positive: true,  spawnWeight: 2 },
};

// ── Spawn Constants ─────────────────────────────────────────

export const POWERUP_RADIUS = 15;
export const POWERUP_SPAWN_X_MIN = CANVAS_WIDTH * 0.25;
export const POWERUP_SPAWN_X_MAX = CANVAS_WIDTH * 0.75;
export const POWERUP_SPAWN_Y_MIN = 40;
export const POWERUP_SPAWN_Y_MAX = CANVAS_HEIGHT - 40;
export const POWERUP_COOLDOWN_MIN = 4;
export const POWERUP_COOLDOWN_MAX = 4;
