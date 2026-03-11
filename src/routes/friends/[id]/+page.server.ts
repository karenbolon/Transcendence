import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users, games, friendships, player_progression } from '$lib/server/db/schema';
import { eq, or, desc, and, inArray } from 'drizzle-orm';
import { calcWinRate } from '$lib/utils/format_game';
import { mapProgressionRow } from '$lib/utils/format_utils';
import type { Tier } from '$lib/types/progression';
import { requireAuth } from '$lib/server/auth/helpers';
import { getUserAchievements } from '$lib/server/db/helpers_queries';

export const load: PageServerLoad = async ({ locals, params }) => {
	const currentUserId = requireAuth(locals);
	const friendId = Number(params.id);

	const [currentUser] = await db
		.select({ username: users.username, name: users.name, avatarUrl: users.avatar_url })
		.from(users)
		.where(eq(users.id, currentUserId));

	if (isNaN(friendId)) {
		throw error(404, 'User not found');
	}

	if (friendId === currentUserId) {
		throw redirect(302, '/profile');
	}

	// Fetch the friend's user record
	const [friend] = await db
		.select()
		.from(users)
		.where(and(eq(users.id, friendId), eq(users.is_deleted, false)));

	if (!friend) {
		throw error(404, 'User not found');
	}

	// Check friendship status
	const [friendship] = await db
		.select()
		.from(friendships)
		.where(
			or(
				and(eq(friendships.user_id, currentUserId), eq(friendships.friend_id, friendId)),
				and(eq(friendships.user_id, friendId), eq(friendships.friend_id, currentUserId))
			)
		);

	const friendshipStatus = friendship?.status ?? null;
	const isFriend = friendshipStatus === 'accepted';

	// Stats
	const wins = friend.wins ?? 0;
	const losses = friend.losses ?? 0;
	const totalGames = wins + losses;
	const winRate = calcWinRate(wins, totalGames);

	// Match history (their matches)
	const matches = await db
		.select()
		.from(games)
		.where(
			or(
				eq(games.player1_id, friendId),
				eq(games.player2_id, friendId)
			)
		)
		.orderBy(desc(games.created_at))
		.limit(10);

	// Opponent names lookup
	const opponentIds = [...new Set(
		matches
			.filter(m => m.player1_id !== friendId)
			.map(m => m.player1_id)
	)];

	let opponentNames: Record<number, string> = {};
	if (opponentIds.length > 0) {
		const rows = await db
			.select({ id: users.id, username: users.username })
			.from(users)
			.where(inArray(users.id, opponentIds));
		opponentNames = Object.fromEntries(rows.map(r => [r.id, r.username]));
	}

	const formattedMatches = matches
		.filter(m => m.status === 'finished')
		.map((match) => {
			const isPlayer1 = match.player1_id === friendId;
			const won = match.winner_id === friendId;

			return {
				id: match.id,
				won,
				userScore: isPlayer1 ? match.player1_score : match.player2_score,
				opponentScore: isPlayer1 ? match.player2_score : match.player1_score,
				opponentName: isPlayer1
					? match.player2_name
					: (opponentNames[match.player1_id] ?? 'Unknown'),
				gameMode: match.game_mode,
				speedPreset: match.speed_preset,
				winScore: match.winner_score,
				durationSeconds: match.duration_seconds,
				playedAt: match.finished_at ?? match.created_at,
			};
		});

	// Progression
	const [progression] = await db
		.select()
		.from(player_progression)
		.where(eq(player_progression.user_id, friendId));

	// Achievements
	const userAchievements = await getUserAchievements(friendId);

	// Head-to-head stats
	const h2hMatches = await db
		.select()
		.from(games)
		.where(
			and(
				or(
					and(eq(games.player1_id, currentUserId), eq(games.player2_id, friendId)),
					and(eq(games.player1_id, friendId), eq(games.player2_id, currentUserId))
				),
				eq(games.status, 'finished')
			)
		)
		.orderBy(desc(games.finished_at));

	const h2hWins = h2hMatches.filter(m => m.winner_id === currentUserId).length;
	const h2hLosses = h2hMatches.filter(m => m.winner_id === friendId).length;
	const h2hTotal = h2hMatches.length;

	let h2hAvgYourScore = 0;
	let h2hAvgTheirScore = 0;
	let h2hBestWin = '';
	let h2hLastPlayed: Date | null = null;

	if (h2hTotal > 0) {
		let totalYourScore = 0;
		let totalTheirScore = 0;
		let bestWinMargin = 0;
		let bestWinScore = '';

		for (const m of h2hMatches) {
			const isPlayer1 = m.player1_id === currentUserId;
			const yourScore = isPlayer1 ? (m.player1_score ?? 0) : (m.player2_score ?? 0);
			const theirScore = isPlayer1 ? (m.player2_score ?? 0) : (m.player1_score ?? 0);
			totalYourScore += yourScore;
			totalTheirScore += theirScore;

			// Best win (biggest margin where you won)
			if (m.winner_id === currentUserId) {
				const margin = yourScore - theirScore;
				if (margin > bestWinMargin) {
					bestWinMargin = margin;
					bestWinScore = `${yourScore}-${theirScore}`;
				}
			}
		}

		h2hAvgYourScore = Math.round((totalYourScore / h2hTotal) * 10) / 10;
		h2hAvgTheirScore = Math.round((totalTheirScore / h2hTotal) * 10) / 10;
		h2hBestWin = bestWinScore || '—';
		h2hLastPlayed = h2hMatches[0].finished_at ?? h2hMatches[0].created_at;
	}

	// Format recent h2h matches (last 5 for the modal)
	const recentH2h = h2hMatches.slice(0, 5).map((m) => {
		const isPlayer1 = m.player1_id === currentUserId;
		return {
			id: m.id,
			won: m.winner_id === currentUserId,
			yourScore: isPlayer1 ? (m.player1_score ?? 0) : (m.player2_score ?? 0),
			theirScore: isPlayer1 ? (m.player2_score ?? 0) : (m.player1_score ?? 0),
			speedPreset: m.speed_preset,
			playedAt: m.finished_at ?? m.created_at,
		};
	});


	return {
		user: {
			username: currentUser.username,
			name: currentUser.name,
			avatarUrl: currentUser.avatarUrl ?? null,
		},
		friend: {
			id: friend.id,
			username: friend.username,
			name: friend.name,
			avatarUrl: friend.avatar_url ?? null,
			bio: friend.bio ?? null,
			isOnline: friend.is_online ?? false,
			createdAt: friend.created_at,
		},
		isFriend,
		friendshipStatus,
		stats: {
			totalGames,
			wins,
			losses,
			winRate,
			currentStreak: progression?.current_win_streak ?? 0,
			bestStreak: progression?.best_win_streak ?? 0,
		},
		headToHead: {
			yourWins: h2hWins,
			theirWins: h2hLosses,
			total: h2hTotal,
			avgScore: `${h2hAvgYourScore}-${h2hAvgTheirScore}`,
			bestWin: h2hBestWin,
			lastPlayed: h2hLastPlayed,
			recentMatches: recentH2h,
		},
		matches: formattedMatches,
		progression: progression ? {
			...mapProgressionRow(progression),
			totalXp: progression.total_xp,
			currentWinStreak: progression.current_win_streak,
			bestWinStreak: progression.best_win_streak,
		} : null,
		achievements: userAchievements,
	};
};