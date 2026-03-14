export type CourtThemeName = 'classic' | 'neon' | 'retro' | 'ocean' | 'pastel';

export interface CourtTheme {
	background: string;
	paddle: string;
	ball: string;
	centerLine: string;
	accent: string;
}

export const COURT_THEMES: Record<CourtThemeName, CourtTheme> = {
	classic: {
		background: '#0a0a1a',
		paddle: '#ffffff',
		ball: '#ff6b9d',
		centerLine: 'rgba(255, 255, 255, 0.15)',
		accent: '#ff6b9d',
	},
	neon: {
		background: '#0a0014',
		paddle: '#00ffff',
		ball: '#ff00ff',
		centerLine: 'rgba(0, 255, 255, 0.2)',
		accent: '#ff00ff',
	},
	retro: {
		background: '#001a00',
		paddle: '#33ff33',
		ball: '#33ff33',
		centerLine: 'rgba(51, 255, 51, 0.15)',
		accent: '#33ff33',
	},
	ocean: {
		background: '#0a1628',
		paddle: '#7dd3fc',
		ball: '#38bdf8',
		centerLine: 'rgba(125, 211, 252, 0.15)',
		accent: '#38bdf8',
	},
	pastel: {
		background: '#1a1520',
		paddle: '#f9a8d4',
		ball: '#c4b5fd',
		centerLine: 'rgba(196, 181, 253, 0.15)',
		accent: '#c4b5fd',
	},
};

/** Parse hex color to RGB components for dynamic rgba usage */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
		: { r: 255, g: 255, b: 255 };
}
