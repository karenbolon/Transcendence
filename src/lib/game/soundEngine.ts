/**
 * Synthesized sound engine using Web Audio API.
 * All sounds are generated — no audio files needed.
 * Call init() after a user gesture (click/keypress) to satisfy browser autoplay policy.
 */
export class SoundEngine {
	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private _volume = 0.7;
	private _muted = false;
	private initialized = false;

	/** Create AudioContext. Must be called after a user gesture. */
	init(): void {
		if (this.initialized) return;
		try {
			this.ctx = new AudioContext();
			this.masterGain = this.ctx.createGain();
			this.masterGain.gain.value = this._muted ? 0 : this._volume;
			this.masterGain.connect(this.ctx.destination);
			this.initialized = true;
		} catch {
			// AudioContext not available — silently disable sounds
		}
	}

	get volume(): number { return this._volume; }
	get muted(): boolean { return this._muted; }

	setVolume(v: number): void {
		this._volume = Math.max(0, Math.min(1, v));
		if (this.masterGain && !this._muted) {
			this.masterGain.gain.value = this._volume;
		}
	}

	setMuted(m: boolean): void {
		this._muted = m;
		if (this.masterGain) {
			this.masterGain.gain.value = m ? 0 : this._volume;
		}
	}

	toggleMute(): void {
		this.setMuted(!this._muted);
	}

	private playTone(freq: number, duration: number, type: OscillatorType = 'square', gain = 0.3): void {
		if (!this.ctx || !this.masterGain) {
			this.init();
			if (!this.ctx || !this.masterGain) return;
		}
		if (this.ctx.state === 'suspended') {
			this.ctx.resume();
		}

		const osc = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		osc.type = type;
		osc.frequency.value = freq;
		g.gain.value = gain;
		g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
		osc.connect(g);
		g.connect(this.masterGain);
		osc.start();
		osc.stop(this.ctx.currentTime + duration);
	}

	private playNote(freq: number, startTime: number, duration: number, type: OscillatorType = 'square', gain = 0.3): void {
		if (!this.ctx || !this.masterGain) return;
		const osc = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		osc.type = type;
		osc.frequency.value = freq;
		g.gain.value = gain;
		g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
		osc.connect(g);
		g.connect(this.masterGain);
		osc.start(startTime);
		osc.stop(startTime + duration);
	}

	/** Paddle hit — pitch rises with ball speed */
	paddleHit(ballSpeed: number): void {
		const baseFreq = 300;
		const speedFactor = Math.min(ballSpeed / 800, 1);
		const freq = baseFreq + speedFactor * 400;
		this.playTone(freq, 0.12, 'square', 0.2);
	}

	/** Wall bounce — softer, lower */
	wallBounce(): void {
		this.playTone(180, 0.08, 'triangle', 0.15);
	}

	/** Score — ascending chime (you) or descending (opponent) */
	score(isPlayer: boolean): void {
		if (!this.ctx) return;
		const now = this.ctx.currentTime;
		if (isPlayer) {
			this.playNote(523, now, 0.12, 'square', 0.25);
			this.playNote(659, now + 0.1, 0.12, 'square', 0.25);
			this.playNote(784, now + 0.2, 0.15, 'square', 0.25);
		} else {
			this.playNote(392, now, 0.15, 'square', 0.2);
			this.playNote(330, now + 0.12, 0.2, 'square', 0.2);
		}
	}

	/** Countdown beep (3, 2, 1) or GO! (0) */
	countdown(n: number): void {
		if (n === 0) {
			this.playTone(880, 0.2, 'square', 0.3);
		} else {
			this.playTone(440, 0.15, 'square', 0.2);
		}
	}

	/** Game over — win fanfare or lose tone */
	gameOver(won: boolean): void {
		if (!this.ctx) return;
		const now = this.ctx.currentTime;
		if (won) {
			this.playNote(523, now, 0.15, 'square', 0.25);
			this.playNote(659, now + 0.12, 0.15, 'square', 0.25);
			this.playNote(784, now + 0.24, 0.15, 'square', 0.25);
			this.playNote(1047, now + 0.36, 0.25, 'square', 0.3);
		} else {
			this.playNote(330, now, 0.2, 'triangle', 0.2);
			this.playNote(262, now + 0.2, 0.3, 'triangle', 0.2);
			this.playNote(196, now + 0.4, 0.4, 'triangle', 0.15);
		}
	}

	/** UI click — subtle blip */
	uiClick(): void {
		this.playTone(600, 0.05, 'sine', 0.1);
	}

	/** Cleanup */
	destroy(): void {
		if (this.ctx) {
			this.ctx.close();
			this.ctx = null;
			this.masterGain = null;
			this.initialized = false;
		}
	}
}

/** Singleton instance */
let instance: SoundEngine | null = null;

export function getSoundEngine(): SoundEngine {
	if (!instance) {
		instance = new SoundEngine();
	}
	return instance;
}
