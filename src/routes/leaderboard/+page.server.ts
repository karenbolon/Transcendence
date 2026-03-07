import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users, friendships } from '$lib/server/db/schema';
import { eq, and, or, desc, gt, inArray } from 'drizzle-orm';
import { calcWinRate } from '$lib/utils/format_game';
import { getFriendIds } from '$lib/server/db/helpers_queries';

export const load: PageServerLoad = async ({ url, locals }) => {
	const tab = url.searchParams.get('tab') === 'friends' ? 'friends' : 'global';
	const isLoggedIn = !!locals.user;
	const userId = locals.user ? Number(locals.user.id) : null;

	let rankings: Array<{
		rank: number;
		id: number;
		username: string;
		name: string;
		avatarUrl: string | null;
		totalGames: number;
		wins: number;
		losses: number;
		winRate: number;
	}> = [];

	if (tab === 'friends' && userId) {
		const friendRows = await db
			.select({ friendId: friendships.friend_id, userId: friendships.user_id })
			.from(friendships)
			.where(
				and(
					eq(friendships.status, 'accepted'),
					or(
						eq(friendships.user_id, userId),
						eq(friendships.friend_id, userId)
					)
				)
			);

		const friendIds = new Set<number>();
		friendIds.add(userId);
		for (const row of friendRows) {
			friendIds.add(row.userId === userId ? row.friendId : row.userId);
		}

		const rows = await db
			.select({
				id: users.id,
				username: users.username,
				name: users.name,
				avatar_url: users.avatar_url,
				wins: users.wins,
				losses: users.losses,
				games_played: users.games_played,
			})
			.from(users)
			.where(
				and(
					eq(users.is_deleted, false),
					inArray(users.id, [...friendIds]),
					gt(users.games_played, 0)
				)
			)
			.orderBy(desc(users.wins), desc(users.games_played))
			.limit(50);

		rankings = rows.map((row, index) => ({
			rank: index + 1,
			id: row.id,
			username: row.username,
			name: row.name,
			avatarUrl: row.avatar_url,
			totalGames: row.games_played ?? 0,
			wins: row.wins ?? 0,
			losses: row.losses ?? 0,
			winRate: calcWinRate(row.wins ?? 0, row.games_played ?? 0),
		}));
	} else {
		const rows = await db
			.select({
				id: users.id,
				username: users.username,
				name: users.name,
				avatar_url: users.avatar_url,
				wins: users.wins,
				losses: users.losses,
				games_played: users.games_played,
			})
			.from(users)
			.where(
				and(
					eq(users.is_deleted, false),
					gt(users.games_played, 0)
				)
			)
			.orderBy(desc(users.wins), desc(users.games_played))
			.limit(50);

		rankings = rows.map((row, index) => ({
			rank: index + 1,
			id: row.id,
			username: row.username,
			name: row.name,
			avatarUrl: row.avatar_url,
			totalGames: row.games_played ?? 0,
			wins: row.wins ?? 0,
			losses: row.losses ?? 0,
			winRate: calcWinRate(row.wins ?? 0, row.games_played ?? 0),
		}));
	}

	const myRank = userId
		? rankings.find((r) => r.id === userId)?.rank ?? null
		: null;

	return { rankings, tab, isLoggedIn, myRank, myId: userId };
};

	// ── FORMAT FOR FRONTEND ────────────────────────────────────
	// const rankings = leaderboard.map((row: any, index: number) => ({
	// 	rank: index + 1,
	// 	id: row.id,
	// 	username: row.username,
	// 	avatarUrl: row.avatar_url,
	// 	totalGames: row.total_games,
	// 	wins: row.wins,
	// 	losses: row.losses,
	// 	winRate: row.win_rate,
	// }));

	// return { rankings };