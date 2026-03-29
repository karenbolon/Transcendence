import type { EffectsPreset, EffectsCustom } from './effectsEngine';

export interface GamePreferences {
	// Existing
	speedPreset: string;
	winScore: number;
	powerUps: boolean;
	// Cosmetic
	theme: string;
	ballSkin: string;
	effectsPreset: EffectsPreset;
	effectsCustom: EffectsCustom;
	soundVolume: number;
	soundMuted: boolean;
}

export const DEFAULT_PREFERENCES: GamePreferences = {
	speedPreset: 'normal',
	winScore: 5,
	powerUps: false,
	theme: 'classic',
	ballSkin: 'default',
	effectsPreset: 'arcade',
	effectsCustom: {
		trail: 'short',
		particles: true,
		screenShake: false,
		speedLines: false,
		chromaticAberration: false,
		freezeFrames: false,
	},
	soundVolume: 70,
	soundMuted: false,
};

/** Merge stored (possibly partial) prefs with defaults */
export function mergePreferences(stored: Partial<GamePreferences> | null | undefined): GamePreferences {
	if (!stored) return { ...DEFAULT_PREFERENCES };
	return {
		...DEFAULT_PREFERENCES,
		...stored,
		effectsCustom: {
			...DEFAULT_PREFERENCES.effectsCustom,
			...(stored.effectsCustom ?? {}),
		},
	};
}

/** Debounced save to API */
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSavePreferences(prefs: Partial<GamePreferences>): void {
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(async () => {
		try {
			await fetch('/api/settings/game-preferences', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(prefs),
			});
		} catch {
			console.warn('[Preferences] Save failed silently');
		}
	}, 500);
}
