export interface ThemeColors {
	background: string;
	backgroundStops?: { pos: number; color: string }[];
	paddle1: string;
	paddle1Glow: string;
	paddle2: string;
	paddle2Glow: string;
	ball: string;
	ballGlow: string;
	courtLine: string;
}

export interface FieldTheme {
	id: string;
	name: string;
	description: string;
	category: 'dark' | 'pastel';
	colors: ThemeColors;
	bgType: 'radial' | 'linear' | 'solid' | 'neon-grid' | 'crt-scanlines' | 'sunset-glow' | 'diagonal';
	bgParams: Record<string, string | number>;
	compatibleBallSkins: string[];
}

export const THEMES: FieldTheme[] = [
	{
		id: 'classic',
		name: 'Classic',
		description: 'Dark blue, pink accents',
		category: 'dark',
		colors: {
		background: '#0a0a1a',
		paddle1: '#ffffff', paddle1Glow: '#60a5fa',
		paddle2: '#ffffff', paddle2Glow: '#ff6b9d',
		ball: '#ff6b9d', ballGlow: '#ff6b9d',
		courtLine: 'rgba(255,255,255,0.15)',
		},
		bgType: 'radial',
		bgParams: { centerColor: '#0f0f2a', edgeColor: '#0a0a1a' },
		compatibleBallSkins: ['default','inferno','frost','toxic','galaxy','rose-gold','lightning','ember','rainbow','pixel','ghost','void-orb'],
	},
	{
		id: 'neon',
		name: 'Neon Cyber',
		description: 'Purple, cyan & magenta glow',
		category: 'dark',
		colors: {
		background: '#0d0221',
		paddle1: '#00ffff', paddle1Glow: '#00ffff',
		paddle2: '#ff00ff', paddle2Glow: '#ff00ff',
		ball: '#ffff00', ballGlow: '#ffff00',
		courtLine: 'rgba(0,255,255,0.2)',
		},
		bgType: 'neon-grid',
		bgParams: { topColor: '#0d0221', midColor: '#150535', gridColor: 'rgba(0,255,255,0.06)', gridSpacing: 20 },
		compatibleBallSkins: ['default','galaxy','lightning','rainbow','pixel','ghost','void-orb'],
	},
	{
		id: 'retro',
		name: 'Retro Green',
		description: 'CRT phosphor, scanlines',
		category: 'dark',
		colors: {
		background: '#000000',
		paddle1: '#00ff41', paddle1Glow: '#00ff41',
		paddle2: '#00ff41', paddle2Glow: '#00ff41',
		ball: '#00ff41', ballGlow: '#00ff41',
		courtLine: 'rgba(0,255,65,0.2)',
		},
		bgType: 'crt-scanlines',
		bgParams: { glowColor: 'rgba(0,255,65,0.03)', scanlineOpacity: 0.15, scanlineGap: 3 },
		compatibleBallSkins: ['default','toxic','rainbow','pixel','ghost','void-orb'],
	},
	{
		id: 'sunset',
		name: 'Sunset',
		description: 'Warm orange-to-purple',
		category: 'dark',
		colors: {
		background: '#1a0510',
		paddle1: '#fbbf24', paddle1Glow: '#fbbf24',
		paddle2: '#fb923c', paddle2Glow: '#fb923c',
		ball: '#fbbf24', ballGlow: '#ff6b2d',
		courtLine: 'rgba(255,180,50,0.15)',
		},
		bgType: 'sunset-glow',
		bgParams: { stop1: '#1a0510', stop2: '#2d1020', stop3: '#1f0a05', stop4: '#0a0505', glowColor: 'rgba(255,100,30,0.06)' },
		compatibleBallSkins: ['default','inferno','ember','rainbow','pixel','ghost','void-orb'],
	},
	{
		id: 'ice',
		name: 'Ice',
		description: 'Cool blue, frost glow',
		category: 'dark',
		colors: {
		background: '#050a14',
		paddle1: '#e0f0ff', paddle1Glow: '#60a5fa',
		paddle2: '#e0f0ff', paddle2Glow: '#38bdf8',
		ball: '#ffffff', ballGlow: '#38bdf8',
		courtLine: 'rgba(150,220,255,0.15)',
		},
		bgType: 'radial',
		bgParams: { centerColor: '#0a1628', edgeColor: '#050a14' },
		compatibleBallSkins: ['default','frost','lightning','rainbow','pixel','ghost','void-orb'],
	},
	{
		id: 'void',
		name: 'Void',
		description: 'Pure black, stark white',
		category: 'dark',
		colors: {
		background: '#000000',
		paddle1: '#ffffff', paddle1Glow: '#ffffff',
		paddle2: '#ffffff', paddle2Glow: '#ffffff',
		ball: '#ffffff', ballGlow: '#ffffff',
		courtLine: 'rgba(255,255,255,0.08)',
		},
		bgType: 'solid',
		bgParams: { color: '#000000' },
		compatibleBallSkins: ['default','inferno','frost','toxic','galaxy','rose-gold','lightning','ember','rainbow','pixel','ghost','void-orb'],
	},
	{
		id: 'sakura',
		name: 'Sakura',
		description: 'Soft pink & cream, cherry blossom',
		category: 'pastel',
		colors: {
		background: '#1a1018',
		paddle1: '#f9a8c9', paddle1Glow: '#f9a8c9',
		paddle2: '#c9a8f9', paddle2Glow: '#c9a8f9',
		ball: '#ffe0ec', ballGlow: '#f9a8c9',
		courtLine: 'rgba(219,160,180,0.25)',
		},
		bgType: 'radial',
		bgParams: { centerColor: '#2a1a22', edgeColor: '#1a1018', glowColor: 'rgba(249,168,201,0.015)', glowX: 0.3, glowY: 0.4 },
		compatibleBallSkins: ['default','frost','rose-gold','rainbow','pixel','ghost','void-orb'],
	},
	{
		id: 'lavender',
		name: 'Lavender Dream',
		description: 'Soft purple & lilac, dreamy',
		category: 'pastel',
		colors: {
		background: '#15101f',
		paddle1: '#c4b5fd', paddle1Glow: '#a78bfa',
		paddle2: '#ddd6fe', paddle2Glow: '#c4b5fd',
		ball: '#e9d5ff', ballGlow: '#a78bfa',
		courtLine: 'rgba(180,160,220,0.2)',
		},
		bgType: 'diagonal',
		bgParams: { stop1: '#1a1525', stop2: '#201830', stop3: '#15101f', glowColor: 'rgba(167,139,250,0.02)', glowX: 0.3, glowY: 0.3 },
		compatibleBallSkins: ['default','galaxy','rainbow','pixel','ghost','void-orb'],
	},
	{
		id: 'mint',
		name: 'Mint Fresh',
		description: 'Cool mint green, clean & calm',
		category: 'pastel',
		colors: {
		background: '#0a1510',
		paddle1: '#86efac', paddle1Glow: '#4ade80',
		paddle2: '#a7f3d0', paddle2Glow: '#6ee7b7',
		ball: '#d1fae5', ballGlow: '#4ade80',
		courtLine: 'rgba(134,239,172,0.15)',
		},
		bgType: 'radial',
		bgParams: { centerColor: '#0f1f18', edgeColor: '#0a1510' },
		compatibleBallSkins: ['default','toxic','rainbow','pixel','ghost','void-orb'],
	},
	{
		id: 'peach',
		name: 'Peach Sorbet',
		description: 'Soft peach & coral, warm pastels',
		category: 'pastel',
		colors: {
		background: '#1a100e',
		paddle1: '#fdba74', paddle1Glow: '#fb923c',
		paddle2: '#fca5a5', paddle2Glow: '#f87171',
		ball: '#fed7aa', ballGlow: '#fdba74',
		courtLine: 'rgba(251,191,146,0.18)',
		},
		bgType: 'linear',
		bgParams: { stop1: '#1f1510', stop2: '#201512', stop3: '#1a100e', glowColor: 'rgba(253,186,116,0.02)', glowX: 0.6, glowY: 0.4 },
		compatibleBallSkins: ['default','rose-gold','ember','rainbow','pixel','ghost','void-orb'],
	},
	{
		id: 'ocean',
		name: 'Ocean Breeze',
		description: 'Teal & seafoam, calm waters',
		category: 'pastel',
		colors: {
		background: '#081515',
		paddle1: '#5eead4', paddle1Glow: '#2dd4bf',
		paddle2: '#99f6e4', paddle2Glow: '#5eead4',
		ball: '#ccfbf1', ballGlow: '#2dd4bf',
		courtLine: 'rgba(94,234,212,0.15)',
		},
		bgType: 'linear',
		bgParams: { stop1: '#0a1a1a', stop2: '#0f2020', stop3: '#081515', glowColor: 'rgba(94,234,212,0.012)', glowX: 0.5, glowY: 0.85 },
		compatibleBallSkins: ['default','lightning','rainbow','pixel','ghost','void-orb'],
	},
];

export function getTheme(id: string): FieldTheme {
	return THEMES.find(t => t.id === id) ?? THEMES[0];
}

export function getThemesByCategory(category: 'dark' | 'pastel'): FieldTheme[] {
	return THEMES.filter(t => t.category === category);
}
