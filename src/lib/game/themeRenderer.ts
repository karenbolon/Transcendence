import type { FieldTheme } from './themes';
import { PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_OFFSET, CANVAS_WIDTH, CANVAS_HEIGHT } from './gameEngine';

export function drawThemeBackground(
	ctx: CanvasRenderingContext2D,
	theme: FieldTheme,
	W: number,
	H: number,
): void {
	const p = theme.bgParams;

	switch (theme.bgType) {
		case 'solid':
			ctx.fillStyle = p.color as string;
			ctx.fillRect(0, 0, W, H);
			break;

		case 'radial': {
			const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
			g.addColorStop(0, p.centerColor as string);
			g.addColorStop(1, p.edgeColor as string);
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, W, H);
			if (p.glowColor) {
				const gx = (p.glowX as number ?? 0.5) * W;
				const gy = (p.glowY as number ?? 0.5) * H;
				const sg = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.5);
				sg.addColorStop(0, p.glowColor as string);
				sg.addColorStop(1, 'rgba(0,0,0,0)');
				ctx.fillStyle = sg;
				ctx.fillRect(0, 0, W, H);
			}
			break;
		}

		case 'linear': {
			const g = ctx.createLinearGradient(0, 0, 0, H);
			g.addColorStop(0, p.stop1 as string);
			g.addColorStop(0.5, p.stop2 as string);
			g.addColorStop(1, p.stop3 as string);
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, W, H);
			if (p.glowColor) {
				const gx = (p.glowX as number ?? 0.5) * W;
				const gy = (p.glowY as number ?? 0.5) * H;
				const sg = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.4);
				sg.addColorStop(0, p.glowColor as string);
				sg.addColorStop(1, 'rgba(0,0,0,0)');
				ctx.fillStyle = sg;
				ctx.fillRect(0, 0, W, H);
			}
			break;
		}

		case 'diagonal': {
			const g = ctx.createLinearGradient(0, 0, W, H);
			g.addColorStop(0, p.stop1 as string);
			g.addColorStop(0.5, p.stop2 as string);
			g.addColorStop(1, p.stop3 as string);
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, W, H);
			if (p.glowColor) {
				const gx = (p.glowX as number ?? 0.3) * W;
				const gy = (p.glowY as number ?? 0.3) * H;
				const sg = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.4);
				sg.addColorStop(0, p.glowColor as string);
				sg.addColorStop(1, 'rgba(0,0,0,0)');
				ctx.fillStyle = sg;
				ctx.fillRect(0, 0, W, H);
			}
			break;
		}

		case 'neon-grid': {
			const g = ctx.createLinearGradient(0, 0, 0, H);
			g.addColorStop(0, p.topColor as string);
			g.addColorStop(0.5, p.midColor as string);
			g.addColorStop(1, p.topColor as string);
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, W, H);
			ctx.strokeStyle = p.gridColor as string;
			ctx.lineWidth = 1;
			const spacing = p.gridSpacing as number;
			for (let y = 0; y < H; y += spacing) {
				ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
			}
			for (let x = 0; x < W; x += spacing) {
				ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
			}
			break;
		}

		case 'crt-scanlines': {
			ctx.fillStyle = '#000000';
			ctx.fillRect(0, 0, W, H);
			const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.7);
			vg.addColorStop(0, p.glowColor as string);
			vg.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = vg;
			ctx.fillRect(0, 0, W, H);
			ctx.fillStyle = `rgba(0,0,0,${p.scanlineOpacity})`;
			const gap = p.scanlineGap as number;
			for (let y = 0; y < H; y += gap) {
				ctx.fillRect(0, y, W, 1);
			}
			break;
		}

		case 'sunset-glow': {
			const g = ctx.createLinearGradient(0, 0, 0, H);
			g.addColorStop(0, p.stop1 as string);
			g.addColorStop(0.4, p.stop2 as string);
			g.addColorStop(0.7, p.stop3 as string);
			g.addColorStop(1, p.stop4 as string);
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, W, H);
			const sg = ctx.createRadialGradient(W / 2, H * 0.8, 0, W / 2, H * 0.8, W * 0.5);
			sg.addColorStop(0, p.glowColor as string);
			sg.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = sg;
			ctx.fillRect(0, 0, W, H);
			break;
		}
	}
}

export function drawCourtLine(
	ctx: CanvasRenderingContext2D,
	theme: FieldTheme,
	W: number,
	H: number,
): void {
	ctx.strokeStyle = theme.colors.courtLine;
	ctx.setLineDash([15, 10]);
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(W / 2, 0);
	ctx.lineTo(W / 2, H);
	ctx.stroke();
	ctx.setLineDash([]);
}

export function drawPaddles(
	ctx: CanvasRenderingContext2D,
	theme: FieldTheme,
	paddle1Y: number,
	paddle2Y: number,
	glowIntensity: number,
	flashLeft: number = 0,
	flashRight: number = 0,
	p1Height: number = PADDLE_HEIGHT,
	p2Height: number = PADDLE_HEIGHT,
	p1Tint: string | null = null,
	p2Tint: string | null = null,
): void {
	const blur = glowIntensity * 10;

	// Left paddle
	const leftFlashBlur = blur + flashLeft * 20;
	ctx.shadowColor = theme.colors.paddle1Glow;
	ctx.shadowBlur = leftFlashBlur;
	ctx.fillStyle = p1Tint
		? p1Tint
		: flashLeft > 0.1
			? `rgba(255,255,255,${0.5 + flashLeft * 0.5})`
			: theme.colors.paddle1;
	ctx.fillRect(PADDLE_OFFSET, paddle1Y, PADDLE_WIDTH, p1Height);

	// Right paddle
	const rightFlashBlur = blur + flashRight * 20;
	ctx.shadowColor = theme.colors.paddle2Glow;
	ctx.shadowBlur = rightFlashBlur;
	ctx.fillStyle = p2Tint
		? p2Tint
		: flashRight > 0.1
			? `rgba(255,255,255,${0.5 + flashRight * 0.5})`
			: theme.colors.paddle2;
	ctx.fillRect(CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH, paddle2Y, PADDLE_WIDTH, p2Height);

	ctx.shadowBlur = 0;
	ctx.shadowColor = 'transparent';
}
