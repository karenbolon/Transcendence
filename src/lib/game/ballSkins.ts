export interface TrailPoint {
	x: number;
	y: number;
	life: number; // 1 = fresh, decays toward 0
}

export type TrailStyle = 'glow' | 'flame' | 'sparkle' | 'zap' | 'rainbow' | 'pixel' | 'ghost' | 'void';

export interface BallSkin {
	id: string;
	name: string;
	description: string;
	isUniversal: boolean;
	color: string | null;       // null = use theme's ball color
	glowColor: string | null;   // null = use theme's ball glow
	trailStyle: TrailStyle;
	particleColors?: string[];
}

export const BALL_SKINS: BallSkin[] = [
	{
		id: 'default',
		name: 'Default',
		description: 'Matches your theme',
		isUniversal: false,
		color: null,
		glowColor: null,
		trailStyle: 'glow',
	},
	{
		id: 'inferno',
		name: 'Inferno',
		description: 'Fireball',
		isUniversal: false,
		color: '#ff4500',
		glowColor: '#ff6b00',
		trailStyle: 'flame',
		particleColors: ['#fbbf24', '#fb923c', '#ef4444'],
	},
	{
		id: 'frost',
		name: 'Frost',
		description: 'Ice crystal',
		isUniversal: false,
		color: '#a5d8ff',
		glowColor: '#38bdf8',
		trailStyle: 'sparkle',
		particleColors: ['#e0f2fe', '#38bdf8', '#ffffff'],
	},
	{
		id: 'toxic',
		name: 'Toxic',
		description: 'Acid ball',
		isUniversal: false,
		color: '#00ff41',
		glowColor: '#00ff41',
		trailStyle: 'glow',
	},
	{
		id: 'galaxy',
		name: 'Galaxy',
		description: 'Cosmic orb',
		isUniversal: false,
		color: '#c084fc',
		glowColor: '#a855f7',
		trailStyle: 'sparkle',
		particleColors: ['#ffffff', '#c084fc', '#e9d5ff', '#fbbf24'],
	},
	{
		id: 'rose-gold',
		name: 'Rose Gold',
		description: 'Pink shimmer',
		isUniversal: false,
		color: '#f9a8c9',
		glowColor: '#ff6b9d',
		trailStyle: 'glow',
	},
	{
		id: 'lightning',
		name: 'Lightning',
		description: 'Electric orb',
		isUniversal: false,
		color: '#38bdf8',
		glowColor: '#0ea5e9',
		trailStyle: 'zap',
	},
	{
		id: 'ember',
		name: 'Ember',
		description: 'Warm glow',
		isUniversal: false,
		color: '#fbbf24',
		glowColor: '#f59e0b',
		trailStyle: 'flame',
		particleColors: ['#fbbf24', '#f59e0b', '#fb923c'],
	},
	{
		id: 'rainbow',
		name: 'Rainbow',
		description: 'Color cycling',
		isUniversal: true,
		color: null,
		glowColor: null,
		trailStyle: 'rainbow',
	},
	{
		id: 'pixel',
		name: 'Pixel',
		description: 'Retro square',
		isUniversal: true,
		color: '#ffffff',
		glowColor: '#ffffff',
		trailStyle: 'pixel',
	},
	{
		id: 'ghost',
		name: 'Ghost',
		description: 'Fades in & out',
		isUniversal: true,
		color: '#ffffff',
		glowColor: '#ffffff',
		trailStyle: 'ghost',
	},
	{
		id: 'void-orb',
		name: 'Void Orb',
		description: 'Dark with white ring',
		isUniversal: true,
		color: '#000000',
		glowColor: '#ffffff',
		trailStyle: 'void',
	},
];

export function getBallSkin(id: string): BallSkin {
	return BALL_SKINS.find(s => s.id === id) ?? BALL_SKINS[0];
}

export function getCompatibleSkins(themeCompatibleIds: string[]): BallSkin[] {
	return BALL_SKINS.filter(s => themeCompatibleIds.includes(s.id));
}
