/**
 * Power-Up Engine
 *
 * Handles spawning, collision, effect application, and expiry.
 * Called from gameEngine.ts updatePlaying() when power-ups are enabled.
 */

import type { GameState, GameSettings } from '../gameEngine';
import { BALL_RADIUS, PADDLE_HEIGHT, PADDLE_OFFSET, PADDLE_WIDTH, CANVAS_WIDTH, CANVAS_HEIGHT } from '../gameEngine';
import {
	type PowerUpType,
	type PowerUpItem,
	type ActiveEffect,
	POWERUP_CONFIG,
	POWERUP_RADIUS,
	POWERUP_SPAWN_X_MIN,
	POWERUP_SPAWN_X_MAX,
	POWERUP_SPAWN_Y_MIN,
	POWERUP_SPAWN_Y_MAX,
	POWERUP_COOLDOWN_MIN,
	POWERUP_COOLDOWN_MAX,
} from './types';

// Re-export types so gameEngine.ts only needs to import from here
export type { PowerUpType, PowerUpItem, ActiveEffect };
export { POWERUP_CONFIG, POWERUP_RADIUS };

/** Spawn a random power-up item on the court */
export function spawnPowerUp(state: GameState): void {
	const types = Object.entries(POWERUP_CONFIG) as [PowerUpType, { duration: number; positive: boolean; spawnWeight: number }][];
	const totalWeight = types.reduce((sum, [, cfg]) => sum + cfg.spawnWeight, 0);
	let roll = Math.random() * totalWeight;
	let chosenType: PowerUpType = types[0]?.[0] ?? 'bigPaddle';

	for (const [type, cfg] of types) {
		roll -= cfg.spawnWeight;
		if (roll <= 0) {
			chosenType = type;
			break;
		}
	}

	state.powerUpItem = {
		type: chosenType,
		x: POWERUP_SPAWN_X_MIN + Math.random() * (POWERUP_SPAWN_X_MAX - POWERUP_SPAWN_X_MIN),
		y: POWERUP_SPAWN_Y_MIN + Math.random() * (POWERUP_SPAWN_Y_MAX - POWERUP_SPAWN_Y_MIN),
		radius: POWERUP_RADIUS,
		active: true,
	};
}

/** Main power-up update loop. Call from updatePlaying() when powerUps is enabled. */
export function updatePowerUps(state: GameState, dt: number, settings: GameSettings): void {
	// 1. Cooldown / spawn
	if (!state.powerUpItem) {
		state.powerUpCooldown -= dt;
		if (state.powerUpCooldown <= 0) {
			spawnPowerUp(state);
		}
	}

	// 2. Ball ↔ power-up collision
	if (state.powerUpItem?.active) {
		const dx = state.ballX - state.powerUpItem.x;
		const dy = state.ballY - state.powerUpItem.y;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist < BALL_RADIUS + state.powerUpItem.radius) {
			collectPowerUp(state, state.powerUpItem);
			state.powerUpItem = null;
			state.powerUpCooldown = POWERUP_COOLDOWN_MIN
				+ Math.random() * (POWERUP_COOLDOWN_MAX - POWERUP_COOLDOWN_MIN);
		}
	}

	// 3. Tick down active effects
	for (let i = state.activeEffects.length - 1; i >= 0; i--) {
		state.activeEffects[i].remainingTime -= dt;
		if (state.activeEffects[i].remainingTime <= 0) {
			onEffectExpired(state, state.activeEffects[i], settings);
			state.activeEffects.splice(i, 1);
		}
	}

	// 4. Apply continuous effects (wall collision, magnet)
	applyContinuousEffects(state, dt);
}

// ══════════════════════════════════════════════════════════════
// STUBS — Behavior logic to be implemented
// See guide-powerups-behavior.md for instructions
// ══════════════════════════════════════════════════════════════

/**
 * Called when the ball collides with a power-up item.
 * Should determine who collected it (state.lastBallHitter),
 * decide the target (collector or opponent based on POWERUP_CONFIG.positive),
 * and add an ActiveEffect to state.activeEffects.
 *
 * For speedBall/slowBall: also modify state.currentBallSpeed and
 * re-scale ballVX/ballVY immediately.
 */
function collectPowerUp(state: GameState, item: PowerUpItem): void {
	const collector = state.lastBallHitter ?? 'player1';
	const opponent = collector === 'player1' ? 'player2' : 'player1';
	const config = POWERUP_CONFIG[item.type];
	if (!config) return;

	// Positive effects help the collector, negative effects hurt the opponent
	const target = config.positive ? collector : opponent;

	// Same effect on same target? Refresh timer instead of stacking
	const existing = state.activeEffects.find(
		e => e.type === item.type && e.target === target
	);
	if (existing) {
		existing.remainingTime = config.duration;
		return;
	}

	// Add the effect
	state.activeEffects.push({
		type: item.type,
		target,
		remainingTime: config.duration,
		duration: config.duration,
	});

	// TODO: Add immediate effects for speedBall/slowBall here (Step 1 in behavior guide)
}

/**
 * Called when an effect's timer reaches 0.
 * Should undo any persistent changes (e.g., restore ball speed
 * for speedBall/slowBall effects).
 */
function onEffectExpired(state: GameState, effect: ActiveEffect, settings: GameSettings): void {
	// TODO: Implement — see guide-powerups-behavior.md Step 2
}

/**
 * Returns the effective paddle height for a player,
 * accounting for bigPaddle and smallPaddle effects.
 * Used in collision detection, paddle movement clamping, and rendering.
 */
export function getEffectivePaddleHeight(state: GameState, player: 'player1' | 'player2'): number {
	let height = PADDLE_HEIGHT;
	for (const effect of state.activeEffects) {
		if (effect.target !== player) continue;
		if (effect.type === 'bigPaddle') height *= 2;
		if (effect.type === 'smallPaddle') height *= 0.5;
	}
	return height;
}

/**
 * Called every frame for effects that need continuous application
 * (e.g., wall barrier collision, magnet attraction).
 */
function applyContinuousEffects(state: GameState, dt: number): void {
	// TODO: Implement — see guide-powerups-behavior.md Step 4
}

/**
 * Checks if a player's controls should be reversed.
 * Used in movePaddles() in gameEngine.ts.
 */
export function isReversed(state: GameState, player: 'player1' | 'player2'): boolean {
	// TODO: Implement — see guide-powerups-behavior.md Step 5
	return false;
}

/**
 * Checks if a player's paddle is frozen.
 * Used in movePaddles() in gameEngine.ts.
 */
export function isFrozen(state: GameState, player: 'player1' | 'player2'): boolean {
	// TODO: Implement — see guide-powerups-behavior.md Step 6
	return false;
}

/**
 * Checks if the invisible ball effect is active.
 * Used in rendering only — the ball still exists in physics.
 */
export function isInvisibleBallActive(state: GameState): boolean {
	// TODO: Implement — see guide-powerups-behavior.md Step 7
	return false;
}
