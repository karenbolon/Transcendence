export type LeaderboardPlayer = {
	id: number;
	username: string;
	displayName: string | null;
	avatarUrl: string | null;
	totalGames: number;
	winRate: number;
	wins: number;
};

export type MatchActivity = {
	type: 'match';
	winnerId: number | null;
	winnerName: string;
	winnerDisplayName: string | null;
	winnerAvatarUrl: string | null;
	loserName: string;
	winnerScore: number | null;
	loserScore: number | null;
	playedAt: Date;
};

export type AchievementActivity = {
	type: 'achievement';
	userId: number;
	username: string;
	displayName: string | null;
	avatarUrl: string | null;
	achievementName: string;
	achievementIcon: string;
	achievementTier: string;
	unlockedAt: Date;
};

export type ActivityItem = MatchActivity | AchievementActivity;

export type Tournament = {
	id: number;
	name: string;
	playerCount: number;
	maxPlayers: number;
	startsAt: Date | null;
	format: string;
	status: string;
};

export type DashboardProps = {
	user: { id: number; username: string; displayName: string | null; avatarUrl: string | null };
	globalLeaderboard: LeaderboardPlayer[];
	friendsLeaderboard: LeaderboardPlayer[];
	activityFeed: ActivityItem[];
	openTournaments: Tournament[];
};
