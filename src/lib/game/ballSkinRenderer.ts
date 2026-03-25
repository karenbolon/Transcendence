import type { BallSkin, TrailPoint } from './ballSkins';
import type { FieldTheme } from './themes';
import { BALL_RADIUS } from './gameEngine';

/** Resolve the actual ball color (skin color or theme fallback) */
function resolveColor(skin: BallSkin, theme: FieldTheme): { color: string; glow: string } {
	if (skin.id === 'rainbow') {
		return { color: '', glow: '' };
	}
	return {
		color: skin.color ?? theme.colors.ball,
		glow: skin.glowColor ?? theme.colors.ballGlow,
	};
}

export function drawBall(
	ctx: CanvasRenderingContext2D,
	skin: BallSkin,
	theme: FieldTheme,
	x: number,
	y: number,
	time: number,
	ballSpin: number,
	ballRotation: number,
): void {
	const { color, glow } = resolveColor(skin, theme);

	let alpha = 1;
	if (skin.trailStyle === 'ghost') {
		alpha = 0.3 + Math.sin(time * 3) * 0.35 + 0.35;
	}

	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.translate(x, y);
	ctx.rotate(ballRotation);

	if (skin.trailStyle === 'void') {
		ctx.fillStyle = '#000000';
		ctx.beginPath();
		ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 1.5;
		ctx.shadowColor = '#ffffff';
		ctx.shadowBlur = 8;
		ctx.beginPath();
		ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
		ctx.stroke();
	} else if (skin.trailStyle === 'pixel') {
		ctx.fillStyle = skin.color ?? theme.colors.ball;
		ctx.shadowColor = skin.glowColor ?? theme.colors.ballGlow;
		ctx.shadowBlur = 6;
		ctx.fillRect(-BALL_RADIUS, -BALL_RADIUS, BALL_RADIUS * 2, BALL_RADIUS * 2);
	} else if (skin.trailStyle === 'rainbow') {
		const hue = (time * 120) % 360;
		ctx.fillStyle = `hsl(${hue},100%,60%)`;
		ctx.shadowColor = `hsl(${hue},100%,50%)`;
		ctx.shadowBlur = 14;
		ctx.beginPath();
		ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
		ctx.fill();
	} else {
		ctx.shadowColor = glow;
		ctx.shadowBlur = 14;
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
		ctx.fill();
	}

	// Spin indicator (shorter than diameter to match existing code)
	if (Math.abs(ballSpin) > 0.01) {
		ctx.strokeStyle = 'rgba(255,255,255,0.6)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(-BALL_RADIUS * 0.6, 0);
		ctx.lineTo(BALL_RADIUS * 0.6, 0);
		ctx.stroke();
	}

	ctx.restore();
	ctx.shadowBlur = 0;
	ctx.shadowColor = 'transparent';
}

export function drawBallTrail(
	ctx: CanvasRenderingContext2D,
	skin: BallSkin,
	theme: FieldTheme,
	trail: TrailPoint[],
	time: number,
): void {
	const { color, glow } = resolveColor(skin, theme);

	for (let i = 0; i < trail.length; i++) {
		const t = trail[i];
		const alpha = t.life * 0.4;

		switch (skin.trailStyle) {
			case 'flame': {
				const colors = skin.particleColors ?? ['#fbbf24', '#fb923c', '#ef4444'];
				for (let j = 0; j < 2; j++) {
					const ox = (Math.random() - 0.5) * 8;
					const oy = (Math.random() - 0.5) * 8;
					ctx.globalAlpha = alpha * 0.7;
					ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
					ctx.beginPath();
					ctx.arc(t.x + ox, t.y + oy, 2.5 * t.life, 0, Math.PI * 2);
					ctx.fill();
				}
				break;
			}
			case 'sparkle': {
				const colors = skin.particleColors ?? [color, '#ffffff'];
				for (let j = 0; j < 2; j++) {
					const ox = (Math.random() - 0.5) * 8;
					const oy = (Math.random() - 0.5) * 8;
					ctx.globalAlpha = alpha * 0.6;
					ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
					ctx.beginPath();
					ctx.arc(t.x + ox, t.y + oy, 1.8 * t.life, 0, Math.PI * 2);
					ctx.fill();
				}
				break;
			}
			case 'zap': {
				ctx.globalAlpha = alpha * 0.6;
				ctx.strokeStyle = color;
				ctx.lineWidth = 1.5;
				ctx.shadowColor = glow;
				ctx.shadowBlur = 6;
				ctx.beginPath();
				let lx = t.x, ly = t.y;
				for (let s = 0; s < 3; s++) {
					const nx = lx + (Math.random() - 0.5) * 12;
					const ny = ly + (Math.random() - 0.5) * 12;
					ctx.lineTo(nx, ny);
					lx = nx; ly = ny;
				}
				ctx.stroke();
				ctx.shadowBlur = 0;
				break;
			}
			case 'rainbow': {
				const hue = ((time * 120) + i * 30) % 360;
				ctx.globalAlpha = alpha;
				ctx.fillStyle = `hsl(${hue},100%,60%)`;
				ctx.beginPath();
				ctx.arc(t.x, t.y, BALL_RADIUS * t.life * 0.8, 0, Math.PI * 2);
				ctx.fill();
				break;
			}
			case 'pixel': {
				ctx.globalAlpha = alpha * 0.5;
				ctx.fillStyle = skin.color ?? theme.colors.ball;
				const s = BALL_RADIUS * 2 * t.life;
				ctx.fillRect(t.x - s / 2, t.y - s / 2, s, s);
				break;
			}
			case 'ghost': {
				ctx.globalAlpha = alpha * 0.3;
				ctx.fillStyle = 'rgba(255,255,255,0.4)';
				ctx.beginPath();
				ctx.arc(t.x, t.y, BALL_RADIUS * t.life, 0, Math.PI * 2);
				ctx.fill();
				break;
			}
			case 'void': {
				ctx.globalAlpha = alpha * 0.3;
				ctx.strokeStyle = '#ffffff';
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.arc(t.x, t.y, BALL_RADIUS * 1.5 * t.life, 0, Math.PI * 2);
				ctx.stroke();
				break;
			}
			default: {
				ctx.globalAlpha = alpha;
				ctx.shadowColor = glow;
				ctx.shadowBlur = 6;
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(t.x, t.y, BALL_RADIUS * t.life * 0.7, 0, Math.PI * 2);
				ctx.fill();
				ctx.shadowBlur = 0;
				break;
			}
		}
	}
	ctx.globalAlpha = 1;
	ctx.shadowBlur = 0;
	ctx.shadowColor = 'transparent';
}
