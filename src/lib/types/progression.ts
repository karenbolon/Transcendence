export type Tier = 'bronze' | 'silver' | 'gold' | 'legendary';

export type FriendshipStatus = 'accepted' | 'pending' | null;

export type LevelSizeProps = {
	level: number;
	size?: 'sm' | 'md' | 'lg';
};

export type Achievement = {
	id: string;
	name: string;
	description: string;
	tier: Tier;
	category: string;
	icon: string;
	unlockedAt: Date | string | null;
	progress?: [number, number] | null;
	hint?: string | null;
};

export type Badge = {
	id: string;
	name: string;
	icon: string;
	tier: Tier;
	category: string;
	unlockedAt: string;
};

export type Progression = {
	level: number;
	currentXp: number;
	xpToNextLevel: number;
};

export type NewAchievement = {
	id: string;
	name: string;
	description: string;
	tier: Tier;
};

export type XpBonus = {
	name: string;
	amount: number;
};

export type Milestone = {
	minLevel: number;
	icon: string;
	title: string;
};