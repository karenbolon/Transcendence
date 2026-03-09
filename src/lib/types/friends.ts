export type ActivityStatus = 'online' | 'playing' | 'away' | 'offline';

export type FriendItem = {
	friendshipId: number;
	id: number;
	username: string;
	name: string | null;
	avatar_url: string | null;
	is_online: boolean | null;
	activity_status?: ActivityStatus; // future: from backend
};

export type SearchResult = {
	id: number;
	username: string;
	avatar_url: string | null;
	is_online: boolean | null;
	relationship: string | null;
	friendshipId: number | null;
};