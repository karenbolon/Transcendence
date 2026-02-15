import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { games, users } from '$lib/server/db/schema';
import { eq, or, desc, sql, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// ── AUTH GUARD ──────────────────────────────────────────────
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const userId = locals.user.id;

	const [user] = await db
		.select()
		.from(users)
		.where(and(eq(users.id, userId), eq(users.is_deleted, false)));

	if (!user) {
		throw redirect(302, '/login');
	}

	// ── FETCH MATCH HISTORY ────────────────────────────────────
	// Get the user's recent matches (newest first, limit 50)
	//
	// We query games where the user is player1.
	// (In local/computer mode, the logged-in user is always player1.
	//  For remote play later, we'd also check player2_id.)
	const matches = await db
		.select()
		.from(games)
		.where(
			or(
				eq(games.player1_id, userId),
				eq(games.player2_id, userId)
			)
		)
		.orderBy(desc(games.created_at))
		.limit(50);

	// ── CALCULATE STATS ────────────────────────────────────────
	// Count wins, losses, and total from the matches we fetched.
	//
	// WHY calculate in JS instead of SQL?
	//   For 50 matches, JS is fast enough and easier to read.
	//   If you had thousands of matches, you'd use SQL aggregates.
	let wins = 0;
	let losses = 0;

	for (const match of matches) {
		if (match.winner_id === userId) {
			wins++;
		} else if (match.status === 'finished') {
			losses++;
		}
	}

	const totalGames = wins + losses;
	const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

	// ── FORMAT MATCHES FOR THE FRONTEND ────────────────────────
	// Transform database rows into a cleaner shape for display
	const formattedMatches = matches
		.filter(m => m.status === 'finished')
		.map((match) => {
			const isPlayer1 = match.player1_id === userId;
			const won = match.winner_id === userId;

			return {
				id: match.id,
				won,
				// Show scores from the user's perspective
				userScore: isPlayer1 ? match.player1_score : match.player2_score,
				opponentScore: isPlayer1 ? match.player2_score : match.player1_score,
				// Opponent info
				opponentName: isPlayer1 ? match.player2_name : 'You were Player 2',
				// Match details
				gameMode: match.game_mode,
				speedPreset: match.speed_preset,
				winScore: match.winner_score,
				durationSeconds: match.duration_seconds,
				playedAt: match.finished_at ?? match.created_at,
			};
		});

	// ── RETURN DATA ────────────────────────────────────────────
	return {
		user: {
			id: user.id,
			username: user.username,
			email: user.email,
			avatarUrl: user.avatar_url ?? null,
			isOnline: user.is_online,
			createdAt: user.created_at,
		},
		matches: formattedMatches,
		stats: {
			totalGames,
			wins,
			losses,
			winRate,
		},
	};
};
