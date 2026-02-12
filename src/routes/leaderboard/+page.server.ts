// ═══════════════════════════════════════════════════════════════════════════
// 🏆 LEADERBOARD LOADER — src/routes/(app)/leaderboard/+page.server.ts
//
// Queries the games table to build a ranked leaderboard.
//
// HOW RANKINGS WORK:
//   1. Find all users who have played at least 1 finished game
//   2. Count their wins and total games
//   3. Calculate win rate
//   4. Sort by wins (primary), then win rate (secondary)
//
// WHY SERVER-SIDE?
//   - Database aggregation is much faster than fetching all matches
//   - Users don't need to be logged in to view the leaderboard
//   - Data is fresh on every page load
// ═══════════════════════════════════════════════════════════════════════════

import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { games, users } from '$lib/server/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {

	// ── SQL AGGREGATION ────────────────────────────────────────
	// This query does everything in one shot:
	//   - Joins games with users
	//   - Groups by user
	//   - Counts total games, wins
	//   - Calculates win rate
	//   - Sorts by wins descending
	//
	// We only look at player1_id for now because in local/computer
	// mode, the logged-in user is always player1. When remote play
	// is added, we'll expand this to include player2_id matches.

	const leaderboard = await db.execute(sql`
		SELECT
			u.id,
			u.username,
			u.avatar_url,
			COUNT(g.id)::int AS total_games,
			COUNT(CASE WHEN g.winner_id = u.id THEN 1 END)::int AS wins,
			COUNT(CASE WHEN g.winner_id IS NOT NULL AND g.winner_id != u.id THEN 1 END)::int AS losses,
			CASE
				WHEN COUNT(g.id) > 0
				THEN ROUND(COUNT(CASE WHEN g.winner_id = u.id THEN 1 END)::numeric / COUNT(g.id) * 100)::int
				ELSE 0
			END AS win_rate
		FROM users u
		INNER JOIN games g ON g.player1_id = u.id AND g.status = 'finished'
		GROUP BY u.id, u.username, u.avatar_url
		HAVING COUNT(g.id) > 0
		ORDER BY wins DESC, win_rate DESC, total_games DESC
		LIMIT 50
	`);

	// ── FORMAT FOR FRONTEND ────────────────────────────────────
	const rankings = leaderboard.map((row: any, index: number) => ({
		rank: index + 1,
		id: row.id,
		username: row.username,
		avatarUrl: row.avatar_url,
		totalGames: row.total_games,
		wins: row.wins,
		losses: row.losses,
		winRate: row.win_rate,
	}));

	return { rankings };
};