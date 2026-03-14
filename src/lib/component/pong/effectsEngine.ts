import { BALL_RADIUS } from './gameEngine';
import { hexToRgb } from './courtThemes';

// ── Types ────────────────────────────────────────────────

export interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
	life: number;
	maxLife: number;
	color: string;
}

export interface TrailPoint {
	x: number;
	y: number;
}

export interface EffectsState {
	particles: Particle[];
	trail: TrailPoint[];
	trailMaxLength: number;
	paddle1Flash: number;
	paddle2Flash: number;
	shakeTimer: number;
	shakeIntensity: number;
	shakeOffsetX: number;
	shakeOffsetY: number;
	scoreScaleLeft: number;
	scoreScaleRight: number;
	scoreScaleTimer: number;
	scoreScaleSide: 'left' | 'right' | null;
}

export type GameEvent =
	| { type: 'paddleHit'; side: 'left' | 'right'; x: number; y: number }
	| { type: 'wallBounce'; x: number; y: number; wall: 'top' | 'bottom' }
	| { type: 'score'; side: 'left' | 'right' }
	| { type: 'countdown'; display: string }
	| { type: 'gameover' };

// ── State Factory ────────────────────────────────────────

export function createEffectsState(): EffectsState {
	return {
		particles: [],
		trail: [],
		trailMaxLength: 10,
		paddle1Flash: 0,
		paddle2Flash: 0,
		shakeTimer: 0,
		shakeIntensity: 0,
		shakeOffsetX: 0,
		shakeOffsetY: 0,
		scoreScaleLeft: 1,
		scoreScaleRight: 1,
		scoreScaleTimer: 0,
		scoreScaleSide: null,
	};
}

export function resetEffects(state: EffectsState): void {
	state.particles = [];
	state.trail = [];
	state.paddle1Flash = 0;
	state.paddle2Flash = 0;
	state.shakeTimer = 0;
	state.shakeOffsetX = 0;
	state.shakeOffsetY = 0;
	state.scoreScaleLeft = 1;
	state.scoreScaleRight = 1;
	state.scoreScaleTimer = 0;
	state.scoreScaleSide = null;
}

// ── Emit Event ───────────────────────────────────────────

export function emitEvent(state: EffectsState, event: GameEvent): void {
	switch (event.type) {
		case 'paddleHit':
			spawnPaddleParticles(state, event.x, event.y, event.side);
			if (event.side === 'left') state.paddle1Flash = 0.15;
			else state.paddle2Flash = 0.15;
			break;

		case 'wallBounce':
			spawnWallParticles(state, event.x, event.y, event.wall);
			break;

		case 'score':
			state.shakeTimer = 0.3;
			state.shakeIntensity = 4;
			state.scoreScaleSide = event.side;
			state.scoreScaleTimer = 0.6;
			state.trail = [];
			break;

		case 'countdown':
		case 'gameover':
			break;
	}
}

// ── Particle Spawners ────────────────────────────────────

function spawnPaddleParticles(
	state: EffectsState,
	x: number,
	y: number,
	side: 'left' | 'right'
): void {
	const count = 8 + Math.floor(Math.random() * 5);
	const baseAngle = side === 'left' ? 0 : Math.PI;

	for (let i = 0; i < count; i++) {
		const angle = baseAngle + (Math.random() - 0.5) * 1.2;
		const speed = 80 + Math.random() * 150;
		state.particles.push({
			x,
			y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			radius: 1.5 + Math.random() * 2,
			life: 0.3 + Math.random() * 0.2,
			maxLife: 0.5,
			color: '#ffffff',
		});
	}
}

function spawnWallParticles(
	state: EffectsState,
	x: number,
	y: number,
	wall: 'top' | 'bottom'
): void {
	const count = 4 + Math.floor(Math.random() * 3);
	const baseAngle = wall === 'top' ? Math.PI / 2 : -Math.PI / 2;

	for (let i = 0; i < count; i++) {
		const angle = baseAngle + (Math.random() - 0.5) * 1.0;
		const speed = 50 + Math.random() * 80;
		state.particles.push({
			x: x + (Math.random() - 0.5) * 20,
			y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			radius: 1 + Math.random() * 1.5,
			life: 0.2 + Math.random() * 0.15,
			maxLife: 0.35,
			color: '#ff6b9d',
		});
	}
}

// ── Update ───────────────────────────────────────────────

export function updateEffects(state: EffectsState, dt: number): void {
	for (let i = state.particles.length - 1; i >= 0; i--) {
		const p = state.particles[i];
		p.life -= dt;
		if (p.life <= 0) {
			state.particles.splice(i, 1);
			continue;
		}
		p.x += p.vx * dt;
		p.y += p.vy * dt;
		p.vx *= 0.96;
		p.vy *= 0.96;
	}

	if (state.paddle1Flash > 0) state.paddle1Flash = Math.max(0, state.paddle1Flash - dt);
	if (state.paddle2Flash > 0) state.paddle2Flash = Math.max(0, state.paddle2Flash - dt);

	if (state.shakeTimer > 0) {
		state.shakeTimer -= dt;
		const progress = state.shakeTimer / 0.3;
		const amplitude = state.shakeIntensity * progress;
		state.shakeOffsetX = (Math.random() - 0.5) * 2 * amplitude;
		state.shakeOffsetY = (Math.random() - 0.5) * 2 * amplitude;
		if (state.shakeTimer <= 0) {
			state.shakeOffsetX = 0;
			state.shakeOffsetY = 0;
		}
	}

	if (state.scoreScaleTimer > 0) {
		state.scoreScaleTimer -= dt;
		const progress = 1 - state.scoreScaleTimer / 0.6;
		const scale = progress < 0.4
			? 1 + 0.5 * (progress / 0.4)            // 1.0 → 1.5 (fast pop)
			: 1 + 0.5 * ((1 - progress) / 0.6);     // 1.5 → 1.0 (slow ease back);
		if (state.scoreScaleSide === 'left') {
			state.scoreScaleLeft = scale;
			state.scoreScaleRight = 1;
		} else {
			state.scoreScaleRight = scale;
			state.scoreScaleLeft = 1;
		}
		if (state.scoreScaleTimer <= 0) {
			state.scoreScaleLeft = 1;
			state.scoreScaleRight = 1;
			state.scoreScaleSide = null;
		}
	}
}

// ── Trail ────────────────────────────────────────────────

export function updateTrail(state: EffectsState, ballX: number, ballY: number): void {
	state.trail.push({ x: ballX, y: ballY });
	if (state.trail.length > state.trailMaxLength) {
		state.trail.shift();
	}
}

export function clearTrail(state: EffectsState): void {
	state.trail = [];
}

// ── Draw ─────────────────────────────────────────────────

export function drawTrail(ctx: CanvasRenderingContext2D, state: EffectsState, accentColor = '#ff6b9d'): void {
	const len = state.trail.length;
	if (len < 2) return;

	const rgb = hexToRgb(accentColor);

	for (let i = 0; i < len - 1; i++) {
		const t = i / (len - 1);
		const point = state.trail[i];
		const radius = BALL_RADIUS * t * 0.8;
		const opacity = t * 0.5;

		if (radius < 0.5) continue;

		ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
		ctx.beginPath();
		ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
		ctx.fill();
	}
}

export function drawParticles(ctx: CanvasRenderingContext2D, state: EffectsState, accentColor = '#ff6b9d'): void {
	const rgb = hexToRgb(accentColor);

	for (const p of state.particles) {
		const alpha = Math.max(0, p.life / p.maxLife);
		const r = p.radius * alpha;
		if (r < 0.3) continue;

		ctx.fillStyle = p.color === '#ffffff'
			? `rgba(255, 255, 255, ${alpha})`
			: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
		ctx.beginPath();
		ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
		ctx.fill();
	}
}

// ── Sound Engine ─────────────────────────────────────────

export class SoundEngine {
	private ctx: AudioContext | null = null;
	public muted: boolean = false;

	/** Initialize AudioContext — call on first user interaction */
	init(): void {
		if (this.ctx) return;
		this.ctx = new AudioContext();
	}

	private playTone(
		frequency: number,
		duration: number,
		type: OscillatorType = 'square',
		volume: number = 0.08
	): void {
		if (this.muted || !this.ctx) return;

		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		osc.type = type;
		osc.frequency.value = frequency;
		gain.gain.value = volume;
		gain.gain.setValueAtTime(volume, this.ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

		osc.connect(gain);
		gain.connect(this.ctx.destination);

		osc.start(this.ctx.currentTime);
		osc.stop(this.ctx.currentTime + duration);
	}

	paddleHit(): void {
		this.playTone(440, 0.05, 'square', 0.06);
	}

	wallBounce(): void {
		this.playTone(660, 0.03, 'square', 0.04);
	}

	score(): void {
		if (this.muted || !this.ctx) return;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(880, this.ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.2);
		gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
		osc.connect(gain);
		gain.connect(this.ctx.destination);
		osc.start(this.ctx.currentTime);
		osc.stop(this.ctx.currentTime + 0.2);
	}

	countdownBeep(): void {
		this.playTone(520, 0.1, 'sine', 0.07);
	}

	goBeep(): void {
		this.playTone(780, 0.15, 'sine', 0.08);
	}

	powerUpCollect(): void {
		this.playTone(880, 0.08, 'sine', 0.1);
		if (!this.muted && this.ctx) {
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			osc.type = 'sine';
			osc.frequency.value = 1100;
			const startTime = this.ctx.currentTime + 0.08;
			gain.gain.setValueAtTime(0.1, startTime);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
			osc.connect(gain);
			gain.connect(this.ctx.destination);
			osc.start(startTime);
			osc.stop(startTime + 0.08);
		}
	}

	gameOver(): void {
		if (this.muted || !this.ctx) return;
		const notes = [440, 554, 659];
		notes.forEach((freq, i) => {
			const osc = this.ctx!.createOscillator();
			const gain = this.ctx!.createGain();
			osc.type = 'square';
			osc.frequency.value = freq;
			const startTime = this.ctx!.currentTime + i * 0.12;
			gain.gain.setValueAtTime(0.06, startTime);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
			osc.connect(gain);
			gain.connect(this.ctx!.destination);
			osc.start(startTime);
			osc.stop(startTime + 0.1);
		});
	}
}