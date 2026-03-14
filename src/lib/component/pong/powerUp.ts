import {
	type GameState,
	CANVAS_WIDTH,
	CANVAS_HEIGHT,
	PADDLE_OFFSET,
	PADDLE_WIDTH,
	PADDLE_HEIGHT,
	BALL_RADIUS,
} from './gameEngine';
import type { CourtTheme } from './courtThemes';
import { hexToRgb } from './courtThemes';

// ── Types ────────────────────────────────────────────────

export type PowerUpType = 'bigPaddle' | 'speedBoost' | 'shrinkOpponent' | 'multiBall' | 'slowOpponent';

export interface SpawnedPowerUp {
	type: PowerUpType;
	x: number;
	y: number;
	radius: number;
}

export interface ActiveEffect {
	player: 1 | 2;
	type: PowerUpType;
	remaining: number;
	duration: number;
}

export interface GhostBall {
	x: number;
	y: number;
	vx: number;
	vy: number;
}

export interface PowerUpState {
	spawned: SpawnedPowerUp | null;
	spawnTimer: number;
	activeEffects: ActiveEffect[];
	ghostBalls: GhostBall[];
	lastHitBy: 1 | 2;
	// MultiBall tracking
	ghostBallCollector: 1 | 2;    // who collected the multiBall
	ghostBallScored: boolean;      // has a ghost already scored this activation?
	pendingGhostScore: 1 | 2 | null; // signal for game loop: which player scored
}

// ── Constants ────────────────────────────────────────────

const POWER_UP_TYPES: PowerUpType[] = ['bigPaddle', 'speedBoost', 'shrinkOpponent', 'multiBall', 'slowOpponent'];
const SPAWN_MIN = 4;
const SPAWN_MAX = 7;
const EFFECT_DURATION = 10;
const POWER_UP_RADIUS = 14;
const SAFE_MARGIN = 80;

export const POWER_UP_LABELS: Record<PowerUpType, string> = {
	bigPaddle: '🔷',
	speedBoost: '⚡',
	shrinkOpponent: '🔻',
	multiBall: '✨',
	slowOpponent: '🐢',
};

// ── State Factory ────────────────────────────────────────

export function createPowerUpState(): PowerUpState {
	return {
		spawned: null,
		spawnTimer: randomSpawnDelay(),
		activeEffects: [],
		ghostBalls: [],
		lastHitBy: 1,
		ghostBallCollector: 1,
		ghostBallScored: false,
		pendingGhostScore: null,
	};
}

export function resetPowerUps(state: PowerUpState): void {
	state.spawned = null;
	state.spawnTimer = randomSpawnDelay();
	state.activeEffects = [];
	state.ghostBalls = [];
	state.lastHitBy = 1;
	state.ghostBallCollector = 1;
	state.ghostBallScored = false;
	state.pendingGhostScore = null;
}

function randomSpawnDelay(): number {
	return SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
}

// ── Update ───────────────────────────────────────────────

export function updatePowerUps(
	state: PowerUpState,
	game: GameState,
	dt: number
): void {
	if (game.phase !== 'playing' || game.scorePause > 0) return;

	// Tick spawn timer
	if (!state.spawned) {
		state.spawnTimer -= dt;
		if (state.spawnTimer <= 0) {
			spawnPowerUp(state);
		}
	}

	// Check ball-powerup collision
	if (state.spawned) {
		const dx = game.ballX - state.spawned.x;
		const dy = game.ballY - state.spawned.y;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < state.spawned.radius + BALL_RADIUS) {
			collectPowerUp(state, game);
		}
	}

	// Tick active effects
	for (let i = state.activeEffects.length - 1; i >= 0; i--) {
		state.activeEffects[i].remaining -= dt;
		if (state.activeEffects[i].remaining <= 0) {
			state.activeEffects.splice(i, 1);
		}
	}

	// Update ghost balls
	updateGhostBalls(state, game, dt);
}

function spawnPowerUp(state: PowerUpState): void {
	const type = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
	const x = SAFE_MARGIN + PADDLE_OFFSET + PADDLE_WIDTH +
		Math.random() * (CANVAS_WIDTH - 2 * (SAFE_MARGIN + PADDLE_OFFSET + PADDLE_WIDTH));
	const y = 40 + Math.random() * (CANVAS_HEIGHT - 80);

	state.spawned = { type, x, y, radius: POWER_UP_RADIUS };
}

function collectPowerUp(state: PowerUpState, game: GameState): void {
	if (!state.spawned) return;

	const type = state.spawned.type;
	const player = state.lastHitBy;

	// Remove existing effect of same type for this player
	state.activeEffects = state.activeEffects.filter(
		e => !(e.player === player && e.type === type)
	);

	state.activeEffects.push({
		player,
		type,
		remaining: EFFECT_DURATION,
		duration: EFFECT_DURATION,
	});

	// Multi-ball: spawn ghost balls heading toward opponent
	if (type === 'multiBall') {
		state.ghostBallCollector = player;
		state.ghostBallScored = false;
		state.ghostBalls = []; // clear any existing ghosts
		spawnGhostBalls(state, game);
	}

	state.spawned = null;
	state.spawnTimer = randomSpawnDelay();
}

function spawnGhostBalls(state: PowerUpState, game: GameState): void {
	const direction = state.ghostBallCollector === 1 ? 1 : -1;
	const speed = game.currentBallSpeed || 400;

	for (let i = 0; i < 2; i++) {
		const angle = (Math.random() - 0.5) * 1.2; // random spread
		state.ghostBalls.push({
			x: CANVAS_WIDTH / 2,
			y: CANVAS_HEIGHT / 2 + (i === 0 ? -60 : 60),
			vx: speed * Math.cos(angle) * direction,
			vy: speed * Math.sin(angle),
		});
	}
}

/** Respawn a ghost ball from center heading toward the opponent */
function respawnGhostBall(gb: GhostBall, collector: 1 | 2, speed: number): void {
	gb.x = CANVAS_WIDTH / 2;
	gb.y = 60 + Math.random() * (CANVAS_HEIGHT - 120);
	const direction = collector === 1 ? 1 : -1;
	const angle = (Math.random() - 0.5) * 1.0;
	gb.vx = speed * Math.cos(angle) * direction;
	gb.vy = speed * Math.sin(angle);
}

function updateGhostBalls(state: PowerUpState, game: GameState, dt: number): void {
	const hasMultiBall = state.activeEffects.some(e => e.type === 'multiBall');
	if (!hasMultiBall) {
		state.ghostBalls = [];
		return;
	}

	const collector = state.ghostBallCollector;
	const opponentEdgeLeft = collector === 2;  // if collector is P2, opponent is P1 (left edge)
	const speed = game.currentBallSpeed || 400;

	for (const gb of state.ghostBalls) {
		gb.x += gb.vx * dt;
		gb.y += gb.vy * dt;

		// Wall bounce (top/bottom)
		if (gb.y - BALL_RADIUS <= 0) {
			gb.y = BALL_RADIUS;
			gb.vy = Math.abs(gb.vy);
		}
		if (gb.y + BALL_RADIUS >= CANVAS_HEIGHT) {
			gb.y = CANVAS_HEIGHT - BALL_RADIUS;
			gb.vy = -Math.abs(gb.vy);
		}

		// Paddle bounce — left paddle (P1)
		if (
			gb.vx < 0 &&
			gb.x - BALL_RADIUS <= PADDLE_OFFSET + PADDLE_WIDTH &&
			gb.x + BALL_RADIUS >= PADDLE_OFFSET &&
			gb.y >= game.paddle1Y &&
			gb.y <= game.paddle1Y + PADDLE_HEIGHT
		) {
			gb.vx = Math.abs(gb.vx);
			gb.x = PADDLE_OFFSET + PADDLE_WIDTH + BALL_RADIUS;
		}

		// Paddle bounce — right paddle (P2)
		const p2Left = CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
		if (
			gb.vx > 0 &&
			gb.x + BALL_RADIUS >= p2Left &&
			gb.x - BALL_RADIUS <= CANVAS_WIDTH - PADDLE_OFFSET &&
			gb.y >= game.paddle2Y &&
			gb.y <= game.paddle2Y + PADDLE_HEIGHT
		) {
			gb.vx = -Math.abs(gb.vx);
			gb.x = p2Left - BALL_RADIUS;
		}

		// Ghost went off LEFT edge
		if (gb.x + BALL_RADIUS < 0) {
			if (opponentEdgeLeft && !state.ghostBallScored) {
				// Ghost scored against P1 — collector (P2) gets the point
				state.ghostBallScored = true;
				state.pendingGhostScore = collector;
			}
			respawnGhostBall(gb, collector, speed);
		}

		// Ghost went off RIGHT edge
		if (gb.x - BALL_RADIUS > CANVAS_WIDTH) {
			if (!opponentEdgeLeft && !state.ghostBallScored) {
				// Ghost scored against P2 — collector (P1) gets the point
				state.ghostBallScored = true;
				state.pendingGhostScore = collector;
			}
			respawnGhostBall(gb, collector, speed);
		}
	}
}

// ── Effect Queries ───────────────────────────────────────

export function getEffectivePaddleHeight(state: PowerUpState, player: 1 | 2): number {
	let height = PADDLE_HEIGHT;
	for (const effect of state.activeEffects) {
		if (effect.type === 'bigPaddle' && effect.player === player) {
			height = PADDLE_HEIGHT * 1.5;
		}
		if (effect.type === 'shrinkOpponent' && effect.player !== player) {
			height = PADDLE_HEIGHT * 0.5;
		}
	}
	return height;
}

export function getBallSpeedMultiplier(state: PowerUpState): number {
	const hasSpeedBoost = state.activeEffects.some(e => e.type === 'speedBoost');
	return hasSpeedBoost ? 1.3 : 1.0;
}

export function getPaddleSpeedMultiplier(state: PowerUpState, player: 1 | 2): number {
	const slowed = state.activeEffects.some(e => e.type === 'slowOpponent' && e.player !== player);
	return slowed ? 0.5 : 1.0;
}

export function setLastHitBy(state: PowerUpState, player: 1 | 2): void {
	state.lastHitBy = player;
}

// ── Draw ─────────────────────────────────────────────────

export function drawSpawnedPowerUp(
	ctx: CanvasRenderingContext2D,
	state: PowerUpState,
	theme: CourtTheme
): void {
	if (!state.spawned) return;

	const { x, y, radius, type } = state.spawned;
	const pulse = 0.6 + Math.sin(Date.now() / 300) * 0.4;
	const rgb = hexToRgb(theme.accent);

	// Outer glow
	ctx.beginPath();
	ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
	ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.15 * pulse})`;
	ctx.fill();

	// Circle background
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;
	ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.6 * pulse})`;
	ctx.lineWidth = 2;
	ctx.fill();
	ctx.stroke();

	// Icon
	ctx.font = `${radius}px sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = '#ffffff';
	ctx.fillText(POWER_UP_LABELS[type], x, y + 1);
	ctx.textBaseline = 'alphabetic';
}

export function drawGhostBalls(
	ctx: CanvasRenderingContext2D,
	state: PowerUpState,
	theme: CourtTheme
): void {
	if (state.ghostBalls.length === 0) return;

	ctx.globalAlpha = 0.5;
	ctx.fillStyle = theme.ball;
	ctx.shadowColor = theme.ball;
	ctx.shadowBlur = 10;

	for (const gb of state.ghostBalls) {
		ctx.beginPath();
		ctx.arc(gb.x, gb.y, BALL_RADIUS, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.shadowBlur = 0;
	ctx.globalAlpha = 1.0;
}

export function drawActiveEffects(
	ctx: CanvasRenderingContext2D,
	state: PowerUpState,
	theme: CourtTheme
): void {
	const p1Effects = state.activeEffects.filter(e => e.player === 1);
	const p2Effects = state.activeEffects.filter(e => e.player === 2);

	drawPlayerEffects(ctx, p1Effects, CANVAS_WIDTH / 4, 70, theme);
	drawPlayerEffects(ctx, p2Effects, (CANVAS_WIDTH / 4) * 3, 70, theme);
}

function drawPlayerEffects(
	ctx: CanvasRenderingContext2D,
	effects: ActiveEffect[],
	centerX: number,
	y: number,
	theme: CourtTheme
): void {
	if (effects.length === 0) return;

	const spacing = 30;
	const startX = centerX - ((effects.length - 1) * spacing) / 2;
	const rgb = hexToRgb(theme.accent);

	for (let i = 0; i < effects.length; i++) {
		const e = effects[i];
		const ex = startX + i * spacing;

		// Icon
		ctx.font = '12px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillStyle = '#ffffff';
		ctx.fillText(POWER_UP_LABELS[e.type], ex, y);

		// Timer bar
		const barWidth = 20;
		const barHeight = 3;
		const progress = e.remaining / e.duration;
		ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
		ctx.fillRect(ex - barWidth / 2, y + 4, barWidth, barHeight);
		ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
		ctx.fillRect(ex - barWidth / 2, y + 4, barWidth * progress, barHeight);
	}
}
