import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { games, users } from '$lib/server/db/schema';
import { eq, or, desc, asc, and, inArray, ne } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth/helpers';

const PAGE_SIZE = 10;

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireAuth(locals);

	// // Read query params: ?type=pong&offset=0
	// const gameType = url.searchParams.get('type');  // null = all
	// const offset = Number(url.searchParams.get('offset')) || 0;

	// How many matches to show (grows with each "Load more" click)
	const limit = Number(url.searchParams.get('limit')) || 10;
	// const gameType = url.searchParams.get('type'); // null = all games
	const gameMode = url.searchParams.get('mode');
	const result = url.searchParams.get('result');       // 'wins' | 'losses' | null (all)
	const sort = url.searchParams.get('sort') || 'newest'; // 'newest' | 'oldest'
	// Build filter conditions
	const conditions = [
		or(
			eq(games.player1_id, userId),
			eq(games.player2_id, userId)
		),
		eq(games.status, 'finished'),
	];

	// Filter by game type if specified
	// if (gameType) {
	// 	conditions.push(eq(games.type, gameType));
	// }

	if (gameMode) {
		conditions.push(eq(games.game_mode, gameMode));
	}

	if (result === 'wins') {
		conditions.push(eq(games.winner_id, userId));
	} else if (result === 'losses') {
		conditions.push(ne(games.winner_id, userId));
	}
	// Sort order
	const orderBy = sort === 'oldest'
			? asc(games.finished_at)
			: desc(games.finished_at);

	// Fetch one extra to know if there are more
	const matches = await db
		.select()
		.from(games)
		.where(and(...conditions))
		.orderBy(orderBy)
		.limit(limit + 1);

	// Check if there are more matches beyond this page
	const hasMore = matches.length > limit;
	const pageMatches = hasMore ? matches.slice(0, limit) : matches;
	// Lookup opponent names (same logic as profile page)
	const player1Ids = [...new Set(
		pageMatches
			.filter(m => m.player1_id !== userId)
			.map(m => m.player1_id)
	)];

	let player1Names: Record<number, string> = {};
	if (player1Ids.length > 0) {
		const rows = await db
			.select({ id: users.id, username: users.username })
			.from(users)
			.where(inArray(users.id, player1Ids));
		player1Names = Object.fromEntries(rows.map(r => [r.id, r.username]));
	}

	// Format matches
	const formattedMatches = pageMatches.map((match) => {
		const isPlayer1 = match.player1_id === userId;
		return {
			id: match.id,
			won: match.winner_id === userId,
			userScore: isPlayer1 ? match.player1_score : match.player2_score,
			opponentScore: isPlayer1 ? match.player2_score : match.player1_score,
			opponentName: isPlayer1
				? match.player2_name
				: (player1Names[match.player1_id] ?? 'Unknown'),
			gameMode: match.game_mode,
			gameType: match.type,
			speedPreset: match.speed_preset,
			winScore: match.winner_score,
			durationSeconds: match.duration_seconds,
			playedAt: match.finished_at ?? match.created_at,
		};
	});

	// Get distinct game types for tabs
	// const allGames = await db
	// 	.select({ type: games.type })
	// 	.from(games)
	// 	.where(
	// 		and(
	// 			or(
	// 				eq(games.player1_id, userId),
	// 				eq(games.player2_id, userId)
	// 			),
	// 			eq(games.status, 'finished')
	// 		)
	// 	)
	// 	.groupBy(games.type);

	// const gameTypes = allGames.map(g => g.type);

	return {
		matches: formattedMatches,
		hasMore,
		limit,
		gameMode,
		result,
		sort,
		// gameType,
		// gameTypes,  // e.g. ['pong'] — grows when you add more games
	};
};