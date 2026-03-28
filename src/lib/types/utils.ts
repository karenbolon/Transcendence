export type ProfileEditData = {
	name: string;
	bio: string | null;
	avatarUrl: string | null;
};

export type Pair<T> = readonly [T, T];

export const flipBy = <T, K extends keyof T>(
	pair: Pair<T>,
	current: T,
	key: K,
): T => (pair[0][key] === current[key] ? pair[1] : pair[0]);
