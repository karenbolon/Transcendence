import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { games, users, friendships, tournaments, tournamentParticipants, achievements, achievement_definitions } from '$lib/server/db/schema';
import { eq, or, desc, and, count, inArray, gte } from 'drizzle-orm';
import type { ActivityItem, Tournament } from '$lib/types/dashboard';
import { getFriendIds } from '$lib/server/db/helpers_queries';
import { calcWinRate } from '$lib/utils/format_game';


export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return{ loggedIn: false as const };
	}

	const userId = Number(locals.user.id);

	// ═══════════════════════════════════════════════════════
	//  GLOBAL LEADERBOARD — Top 3 by wins
	// ═══════════════════════════════════════════════════════
	const allUsers = await db
		.select({
			id: users.id,
			username: users.username,
			name: users.name,
			avatar_url: users.avatar_url,
			is_online: users.is_online,
			// wins: count(games.id).filter(games.winnerId.eq(users.id)),
		})
		.from(users)
		.where(eq(users.is_deleted, false));
		// .leftJoin(games, eq(games.winnerId, users.id))
		// .groupBy(users.id)
		// .orderBy(desc(count(games.id)))
		// .limit(3);

	const allGames = await db
		.select()
		.from(games)
		.where(eq(games.status, 'finished'));

	const userWins: Record<number, { wins: number; total: number }> = {};

	for (const user of allUsers) {
		userWins[user.id] = { wins: 0, total: 0 };
	}

	for (const game of allGames) {
		if (game.player1_id && userWins[game.player1_id]) {
			userWins[game.player1_id].total ++;
			if (game.winner_id === game.player1_id) userWins[game.player1_id].wins ++;
		}
		if (game.player2_id && userWins[game.player2_id]) {
			userWins[game.player2_id].total ++;
			if (game.winner_id === game.player2_id) userWins[game.player2_id].wins ++;
		}

	}

	const globalLeaderboard = allUsers
		.map((u) => ({
			id: u.id,
			username: u.username,
			displayName: u.name,
			avatarUrl: u.avatar_url ?? null,
			isOnline: u.is_online,
			wins: userWins[u.id]?.wins ?? 0,
			totalGames: userWins[u.id]?.total ?? 0,
			winRate: calcWinRate(userWins[u.id]?.wins ?? 0, userWins[u.id]?.total ?? 0),
		}))
		.filter((u) => u.totalGames > 0)
		.sort((a, b) => b.wins - a.wins)
		.slice(0, 3);

	// ═══════════════════════════════════════════════════════
	//  FRIENDS LEADERBOARD — Top 3 friends by wins
	// ═══════════════════════════════════════════════════════
	let friendIds: number[] = [];
	try {
		friendIds = await getFriendIds(userId);
	} catch {
		friendIds = [];
	}

	const friendLeaderboardIds = [userId, ...friendIds];

	const friendsLeaderboard = allUsers
		.filter((u) => friendLeaderboardIds.includes(u.id))
		.map((u) => ({
			id: u.id,
			username: u.username,
			displayName: u.name,
			avatarUrl: u.avatar_url ?? null,
			isOnline: u.is_online,
			wins: userWins[u.id]?.wins ?? 0,
			totalGames: userWins[u.id]?.total ?? 0,
			winRate: calcWinRate(userWins[u.id]?.wins ?? 0, userWins[u.id]?.total ?? 0),
		}))
		.sort((a, b) => b.wins - a.wins)
		.slice(0, 3);

	// ═══════════════════════════════════════════════════════
	//  ACTIVITY FEED — Recent match results
	// ═══════════════════════════════════════════════════════
	const feedUserIds = [userId, ...friendIds];

	const matchFeed: ActivityItem[] = allGames
		.filter((g) => {
			const isRelevant =
				(g.player1_id && feedUserIds.includes(g.player1_id)) ||
				(g.player2_id && feedUserIds.includes(g.player2_id));
			return isRelevant && g.game_mode === 'remote';
		})
		.sort((a, b) => {
			const aTime = (a.finished_at ?? a.created_at).getTime();
			const bTime = (b.finished_at ?? b.created_at).getTime();
			return bTime - aTime;
		})
		.slice(0, 4)
		.map((g) => {
			const winnerId = g.winner_id;
			const winnerIsP1 = winnerId === g.player1_id;

			const p1User = allUsers.find((u) => u.id === g.player1_id);
			const p2User = allUsers.find((u) => u.id === g.player2_id);

			const winnerUser = winnerIsP1 ? p1User : p2User;
			const loserUser = winnerIsP1 ? p2User : p1User;

			const winnerName = winnerUser?.name ?? winnerUser?.username ?? 'Player';
			const loserName = loserUser?.name ?? loserUser?.username ?? (g.player2_name ?? 'Guest');

			return {
				type: 'match' as const,
				winnerId,
				winnerName,
				winnerDisplayName: winnerUser?.name ?? null,
				winnerAvatarUrl: winnerUser?.avatar_url ?? null,
				loserName,
				winnerScore: winnerIsP1 ? g.player1_score : g.player2_score,
				loserScore: winnerIsP1 ? g.player2_score : g.player1_score,
				playedAt: g.finished_at ?? g.created_at,
			};
		});

	// ═══════════════════════════════════════════════════════
	//  ACHIEVEMENT FEED — Recent achievements (last 7 days)
	// ═══════════════════════════════════════════════════════
	let achievementFeed: ActivityItem[] = [];
	try {
		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

		const recentAchievements = await db
			.select({
				userId: achievements.user_id,
				achievementName: achievement_definitions.name,
				achievementIcon: achievement_definitions.icon,
				achievementTier: achievement_definitions.tier,
				unlockedAt: achievements.unlocked_at,
				username: users.username,
				displayName: users.name,
				avatarUrl: users.avatar_url,
			})
			.from(achievements)
			.innerJoin(achievement_definitions, eq(achievements.achievement_id, achievement_definitions.id))
			.innerJoin(users, eq(achievements.user_id, users.id))
			.where(
				and(
					inArray(achievements.user_id, feedUserIds),
					gte(achievements.unlocked_at, sevenDaysAgo)
				)
			)
			.orderBy(desc(achievements.unlocked_at))
			.limit(4);

		achievementFeed = recentAchievements.map((a) => ({
			type: 'achievement' as const,
			userId: a.userId!,
			username: a.username,
			displayName: a.displayName,
			avatarUrl: a.avatarUrl ?? null,
			achievementName: a.achievementName,
			achievementIcon: a.achievementIcon,
			achievementTier: a.achievementTier,
			unlockedAt: a.unlockedAt,
		}));
	} catch {
		// achievements table might not be populated yet
	}

	// Merge and sort by date, take most recent 10
	const activityFeed: ActivityItem[] = [...matchFeed, ...achievementFeed]
		.sort((a, b) => {
			const aTime = (a.type === 'match' ? a.playedAt : a.unlockedAt).getTime();
			const bTime = (b.type === 'match' ? b.playedAt : b.unlockedAt).getTime();
			return bTime - aTime;
		})
		.slice(0, 5);
	// ═══════════════════════════════════════════════════════
	//  OPEN TOURNAMENTS
	// ═══════════════════════════════════════════════════════
		let openTournaments: Tournament[] = [];

	try {
		const tournRows = await db
			.select()
			.from(tournaments)
			.where(
				or(
					eq(tournaments.status, 'open'),
					eq(tournaments.status, 'scheduled')
				)
			)
			.orderBy(tournaments.started_at)
			.limit(3);

		for (const t of tournRows) {
			const [result] = await db
				.select({ value: count() })
				.from(tournamentParticipants)
				.where(eq(tournamentParticipants.tournament_id, t.id));

			openTournaments.push({
				id: t.id,
				name: t.name,
				playerCount: Number(result.value),
				maxPlayers: t.max_players ?? 4,
				startsAt: t.started_at ?? null,
				format: t.game_type ?? 'single_elimination',
				status: t.status,
			});
		}
	} catch {
		// tournaments table might not be populated yet
	}

	return {
		loggedIn: true as const,
		user: {
			id: userId,
			username: locals.user.username,
			displayName: locals.user.name,
			avatarUrl: locals.user.avatar_url ?? null,
		},
		globalLeaderboard,
		friendsLeaderboard,
		activityFeed,
		openTournaments,
	};
};