export type ProfileEditData = {
	name: string;
	bio: string | null;
	avatarUrl: string | null;
};

export type Pair<T> = readonly [T, T];
