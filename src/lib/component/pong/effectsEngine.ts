import type { TrailPoint } from './ballSkins';

export type EffectsPreset = 'none' | 'subtle' | 'arcade' | 'spectacle' | 'custom';

export interface EffectsCustom {
	trail: 'off' | 'short' | 'long';
	particles: boolean;
	screenShake: boolean;
	speedLines: boolean;
	chromaticAberration: boolean;
	freezeFrames: boolean;
}

export interface EffectsConfig {
	preset: EffectsPreset;
	custom: EffectsCustom;
}

export const DEFAULT_EFFECTS_CUSTOM: EffectsCustom = {
	trail: 'short',
	particles: true,
	screenShake: false,
	speedLines: false,
	chromaticAberration: false,
	freezeFrames: false,
};

/** Resolve preset into concrete settings */
export function resolveEffects(config: EffectsConfig): {
	maxTrailLength: number;
	particleCount: number;
	screenShake: boolean;
	speedLines: boolean;
	chromaticAberration: boolean;
	freezeFrames: boolean;
} {
	if (config.preset === 'custom') {
		return {
			maxTrailLength: config.custom.trail === 'off' ? 0 : config.custom.trail === 'short' ? 4 : 18,
			particleCount: config.custom.particles ? 15 : 0,
			screenShake: config.custom.screenShake,
			speedLines: config.custom.speedLines,
			chromaticAberration: config.custom.chromaticAberration,
			freezeFrames: config.custom.freezeFrames,
		};
	}
	const presets = {
		none:      { maxTrailLength: 0,  particleCount: 0,  screenShake: false, speedLines: false, chromaticAberration: false, freezeFrames: false },
		subtle:    { maxTrailLength: 4,  particleCount: 6,  screenShake: false, speedLines: false, chromaticAberration: false, freezeFrames: false },
		arcade:    { maxTrailLength: 10, particleCount: 18, screenShake: true,  speedLines: true,  chromaticAberration: false, freezeFrames: false },
		spectacle: { maxTrailLength: 18, particleCount: 32, screenShake: true,  speedLines: true,  chromaticAberration: true,  freezeFrames: true },
	};
	return presets[config.preset] ?? presets.arcade;
}

interface Particle {
	x: number; y: number;
	vx: number; vy: number;
	life: number;
	color: string;
	size: number;
}

interface SpeedLine {
	x: number; y: number;
	len: number;
	life: number;
}

export class EffectsEngine {
	particles: Particle[] = [];
	trail: TrailPoint[] = [];
	speedLines: SpeedLine[] = [];
	shakeX = 0;
	shakeY = 0;
	freezeTimer = 0;
	aberration = 0;
	paddleFlashLeft = 0;   // 1 = full flash, decays to 0
	paddleFlashRight = 0;
	ballPulse = 0;         // ball scale pulse on hit
	private config!: ReturnType<typeof resolveEffects>;

	setConfig(effectsConfig: EffectsConfig): void {
		this.config = resolveEffects(effectsConfig);
	}

	update(dt: number): void {
		if (this.freezeTimer > 0) {
			this.freezeTimer -= dt;
			return;
		}

		this.shakeX *= 0.85;
		this.shakeY *= 0.85;
		if (Math.abs(this.shakeX) < 0.1) this.shakeX = 0;
		if (Math.abs(this.shakeY) < 0.1) this.shakeY = 0;

		this.aberration *= 0.9;
		if (this.aberration < 0.1) this.aberration = 0;

		// Decay paddle flash
		this.paddleFlashLeft *= 0.88;
		if (this.paddleFlashLeft < 0.01) this.paddleFlashLeft = 0;
		this.paddleFlashRight *= 0.88;
		if (this.paddleFlashRight < 0.01) this.paddleFlashRight = 0;

		// Decay ball pulse
		this.ballPulse *= 0.85;
		if (this.ballPulse < 0.01) this.ballPulse = 0;

		for (const p of this.particles) {
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.life -= dt * 2;
		}
		this.particles = this.particles.filter(p => p.life > 0);

		for (const t of this.trail) {
			t.life -= dt * (this.config.maxTrailLength <= 4 ? 4 : this.config.maxTrailLength <= 10 ? 2 : 1.2);
		}
		this.trail = this.trail.filter(t => t.life > 0);

		for (const s of this.speedLines) {
			s.life -= dt;
		}
		this.speedLines = this.speedLines.filter(s => s.life > 0);
	}

	addTrailPoint(x: number, y: number): void {
		if (this.config.maxTrailLength === 0) return;
		this.trail.push({ x, y, life: 1 });
		while (this.trail.length > this.config.maxTrailLength) {
			this.trail.shift();
		}
	}

	spawnParticles(x: number, y: number, colors: string[]): void {
		if (this.config.particleCount === 0) return;
		for (let i = 0; i < this.config.particleCount; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 30 + Math.random() * 120;
			this.particles.push({
				x, y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				life: 1,
				color: colors[Math.floor(Math.random() * colors.length)],
				size: 1.5 + Math.random() * 2,
			});
		}
	}

	shake(intensity: number): void {
		if (!this.config.screenShake) return;
		this.shakeX = (Math.random() - 0.5) * intensity;
		this.shakeY = (Math.random() - 0.5) * intensity;
	}

	triggerAberration(amount: number): void {
		if (!this.config.chromaticAberration) return;
		this.aberration = amount;
	}

	triggerFreeze(duration: number): void {
		if (!this.config.freezeFrames) return;
		this.freezeTimer = duration;
	}

	maybeSpawnSpeedLine(ballVX: number, W: number, H: number): void {
		if (!this.config.speedLines) return;
		if (Math.abs(ballVX) < 400) return;
		if (Math.random() > 0.3) return;
		this.speedLines.push({
			x: Math.random() * W,
			y: Math.random() * H,
			len: 15 + Math.random() * 25,
			life: 0.3,
		});
	}

	/** Paddle hit — shake only at Spectacle level (Arcade shakes on score only) */
	onPaddleHit(x: number, y: number, colors: string[], side: 'left' | 'right'): void {
		this.spawnParticles(x, y, colors);
		this.ballPulse = 1;
		if (side === 'left') this.paddleFlashLeft = 1;
		else this.paddleFlashRight = 1;
		if (this.config.chromaticAberration) {
			this.shake(5);
			this.triggerAberration(3);
			this.triggerFreeze(0.03);
		}
	}

	/** Score — shake at Arcade+ level */
	onScore(x: number, y: number, colors: string[]): void {
		this.spawnParticles(x, y, colors);
		this.shake(this.config.chromaticAberration ? 8 : 4);
		this.triggerAberration(6);
		this.triggerFreeze(0.08);
	}

	drawParticles(ctx: CanvasRenderingContext2D): void {
		for (const p of this.particles) {
			ctx.globalAlpha = Math.max(0, p.life);
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	drawSpeedLines(ctx: CanvasRenderingContext2D, ballVXSign: number): void {
		if (this.speedLines.length === 0) return;
		ctx.strokeStyle = 'rgba(255,255,255,0.08)';
		ctx.lineWidth = 1;
		for (const s of this.speedLines) {
			ctx.globalAlpha = s.life * 0.5;
			ctx.beginPath();
			ctx.moveTo(s.x, s.y);
			ctx.lineTo(s.x + s.len * ballVXSign, s.y);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}

	drawAberration(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
		if (this.aberration < 0.5) return;
		ctx.globalAlpha = 0.4;
		ctx.fillStyle = '#ff0000';
		ctx.beginPath();
		ctx.arc(x - this.aberration, y, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#0000ff';
		ctx.beginPath();
		ctx.arc(x + this.aberration, y, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
	}

	reset(): void {
		this.particles = [];
		this.trail = [];
		this.speedLines = [];
		this.shakeX = 0;
		this.shakeY = 0;
		this.freezeTimer = 0;
		this.aberration = 0;
		this.paddleFlashLeft = 0;
		this.paddleFlashRight = 0;
		this.ballPulse = 0;
	}
}
