/**
 * Power-Up Renderer
 *
 * All canvas drawing for power-ups: items, HUD, wall barriers,
 * paddle tinting, invisible ball effect.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_OFFSET, PADDLE_WIDTH } from '../gameEngine';

// ── Colors & Icons ──────────────────────────────────────────

export const POWERUP_COLORS: Record<string, string> = {
	bigPaddle: '#4ade80',
	smallPaddle: '#f87171',
	speedBall: '#fbbf24',
	slowBall: '#60a5fa',
	reverseControls: '#c084fc',
	freeze: '#22d3ee',
	invisibleBall: '#6b7280',
	wall: '#fb923c',
	magnet: '#e879f9',
};

export const POWERUP_ICONS: Record<string, string> = {
	bigPaddle: '↕',
	smallPaddle: '↔',
	speedBall: '⚡',
	slowBall: '❄',
	reverseControls: '🔄',
	freeze: '🧊',
	invisibleBall: '👻',
	wall: '🧱',
	magnet: '🧲',
};

// ── Draw Power-Up Item (pulsing circle on the court) ────────

export function drawPowerUpItem(
	ctx: CanvasRenderingContext2D,
	item: { type: string; x: number; y: number; radius: number },
	gameTime: number,
): void {
	const color = POWERUP_COLORS[item.type] ?? '#ffffff';
	const icon = POWERUP_ICONS[item.type] ?? '?';
	const pulse = 0.7 + Math.sin(gameTime * 5) * 0.3;

	// Outer glow
	ctx.globalAlpha = 0.15 * pulse;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(item.x, item.y, item.radius * 2.2, 0, Math.PI * 2);
	ctx.fill();

	// Main circle
	ctx.globalAlpha = 0.85;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
	ctx.fill();

	// Border
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 1.5;
	ctx.globalAlpha = 0.5;
	ctx.stroke();

	// Icon
	ctx.globalAlpha = 1;
	ctx.fillStyle = '#fff';
	ctx.font = 'bold 13px monospace';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(icon, item.x, item.y);

	// Restore defaults so subsequent draws aren't affected
	ctx.textBaseline = 'alphabetic';
}

// ── Draw Effects HUD (under each player's score) ────────────

export function drawEffectsHUD(
	ctx: CanvasRenderingContext2D,
	effects: { type: string; target: string; remainingTime: number; duration: number }[],
): void {
	if (effects.length === 0) return;

	const p1Effects = effects.filter(e => e.target === 'player1');
	const p2Effects = effects.filter(e => e.target === 'player2');

	// Player 1 effects — under left score (centered at CANVAS_WIDTH / 4)
	if (p1Effects.length > 0) {
		drawPlayerEffects(ctx, p1Effects, CANVAS_WIDTH / 4, 68);
	}

	// Player 2 effects — under right score (centered at CANVAS_WIDTH * 3/4)
	if (p2Effects.length > 0) {
		drawPlayerEffects(ctx, p2Effects, (CANVAS_WIDTH / 4) * 3, 68);
	}
}

function drawPlayerEffects(
	ctx: CanvasRenderingContext2D,
	effects: { type: string; target: string; remainingTime: number; duration: number }[],
	centerX: number,
	startY: number,
): void {
	const barWidth = 44;
	const rowHeight = 16;
	const gap = 3;
	const totalWidth = effects.length * (barWidth + gap) - gap;
	let x = centerX - totalWidth / 2;

	for (const effect of effects) {
		const color = POWERUP_COLORS[effect.type] ?? '#ffffff';
		const icon = POWERUP_ICONS[effect.type] ?? '?';
		const pct = Math.max(0, effect.remainingTime / effect.duration);

		// Bar background
		ctx.globalAlpha = 0.25;
		ctx.fillStyle = '#374151';
		ctx.fillRect(x, startY, barWidth, rowHeight);

		// Bar fill (shrinks with time)
		ctx.globalAlpha = 0.7;
		ctx.fillStyle = color;
		ctx.fillRect(x, startY, barWidth * pct, rowHeight);

		// Icon centered on the bar
		ctx.globalAlpha = 1;
		ctx.fillStyle = '#fff';
		ctx.font = '10px monospace';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(icon, x + barWidth / 2, startY + rowHeight / 2);

		x += barWidth + gap;
	}

	// Restore
	ctx.textBaseline = 'alphabetic';
	ctx.globalAlpha = 1;
}

// ── Draw Wall Barriers ──────────────────────────────────────

export function drawWallBarriers(
	ctx: CanvasRenderingContext2D,
	effects: { type: string; target: string; remainingTime: number; duration: number }[],
	gameTime: number,
): void {
	for (const effect of effects) {
		if (effect.type !== 'wall') continue;

		const wallX = effect.target === 'player1'
			? PADDLE_OFFSET + PADDLE_WIDTH + 60
			: CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH - 68;
		const wallHeight = 100;
		const wallY = CANVAS_HEIGHT / 2 - wallHeight / 2;

		// Glow
		ctx.globalAlpha = 0.15 + Math.sin(gameTime * 4) * 0.05;
		ctx.fillStyle = '#fb923c';
		ctx.fillRect(wallX - 4, wallY - 4, 16, wallHeight + 8);

		// Wall body
		ctx.globalAlpha = 0.6;
		ctx.fillStyle = '#fb923c';
		ctx.fillRect(wallX, wallY, 8, wallHeight);

		// Border
		ctx.strokeStyle = '#fdba74';
		ctx.lineWidth = 1;
		ctx.globalAlpha = 0.4;
		ctx.strokeRect(wallX, wallY, 8, wallHeight);

		ctx.globalAlpha = 1;
	}
}

// ── Paddle Effect Tint Color ────────────────────────────────

/**
 * Returns a tint color if the paddle has an active effect, or null for default.
 * Use this when drawing paddles to show freeze (cyan) or reverse (purple).
 */
export function getPaddleEffectTint(
	effects: { type: string; target: string }[],
	player: 'player1' | 'player2',
): string | null {
	const playerEffects = effects.filter(e => e.target === player);
	if (playerEffects.some(e => e.type === 'freeze')) return '#22d3ee';
	if (playerEffects.some(e => e.type === 'reverseControls')) return '#c084fc';
	return null;
}

// ── Invisible Ball Check (for rendering) ────────────────────

/**
 * Returns the alpha value to use when drawing the ball.
 * Normal = 1.0, invisible in mid-court = 0.04.
 */
export function getBallAlpha(
	ballX: number,
	isInvisibleActive: boolean,
): number {
	if (!isInvisibleActive) return 1;
	const inMiddleZone = ballX > CANVAS_WIDTH * 0.2 && ballX < CANVAS_WIDTH * 0.8;
	return inMiddleZone ? 0.04 : 1;
}
