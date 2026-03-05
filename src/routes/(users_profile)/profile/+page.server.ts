import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { games, users, player_progression, achievements, achievement_definitions } from '$lib/server/db/schema';
import { eq, or, desc, and, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// ── AUTH GUARD ──────────────────────────────────────────────
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const userId = Number(locals.user.id);

	const [user] = await db
		.select()
		.from(users)
		.where(and(eq(users.id, userId), eq(users.is_deleted, false)));

	if (!user) {
		throw redirect(302, '/login');
	}

	// ── STATS (from user record — lifetime totals) ───────────
	const wins = user.wins ?? 0;
	const losses = user.losses ?? 0;
	const totalGames = wins + losses;
	const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

	// ── FETCH MATCH HISTORY ────────────────────────────────────
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
		.limit(20);

	// ── CALCULATE STATS ────────────────────────────────────────
	// let wins = 0;
	// let losses = 0;

	// for (const match of matches) {
	// 	if (match.winner_id === userId) {
	// 		wins++;
	// 	} else if (match.status === 'finished') {
	// 		losses++;
	// 	}
	// }

	// const totalGames = wins + losses;
	// const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

	// ── LOOKUP PLAYER1 NAMES (for matches where user was player2) ──
	const player1Ids = [...new Set(
		matches
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

	// ── FORMAT MATCHES FOR THE FRONTEND ────────────────────────
	const formattedMatches = matches
		.filter(m => m.status === 'finished')
		.map((match) => {
			const isPlayer1 = match.player1_id === userId;
			const won = match.winner_id === userId;

			return {
				id: match.id,
				won,
				userScore: isPlayer1 ? match.player1_score : match.player2_score,
				opponentScore: isPlayer1 ? match.player2_score : match.player1_score,
				// opponentName: isPlayer1 ? match.player2_name : 'You were Player 2',
				opponentName: isPlayer1 ? match.player2_name : (player1Names[match.player1_id] ?? 'Unknown'),
				gameMode: match.game_mode,
				speedPreset: match.speed_preset,
				winScore: match.winner_score,
				durationSeconds: match.duration_seconds,
				playedAt: match.finished_at ?? match.created_at,
			};
		});

	// ── FETCH PROGRESSION ──────────────────────────────────────
	const [progression] = await db
		.select()
		.from(player_progression)
		.where(eq(player_progression.user_id, userId));

	// ── FETCH ACHIEVEMENTS (with definitions) ──────────────────
	const userAchievements = await db
		.select({
			id: achievement_definitions.id,
			name: achievement_definitions.name,
			description: achievement_definitions.description,
			tier: achievement_definitions.tier,
			category: achievement_definitions.category,
			icon: achievement_definitions.icon,
			unlockedAt: achievements.unlocked_at,
		})
		.from(achievements)
		.innerJoin(achievement_definitions, eq(achievements.achievement_id, achievement_definitions.id))
		.where(eq(achievements.user_id, userId))
		.orderBy(desc(achievements.unlocked_at));

	// ── RETURN DATA ────────────────────────────────────────────
	return {
		user: {
			id: user.id,
			username: user.username,
			name: user.name,
			email: user.email,
			avatarUrl: user.avatar_url ?? null,
			bio: user.bio ?? null,
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
		progression: progression
			? {
				level: progression.current_level,
				currentXp: progression.current_xp,
				xpToNextLevel: progression.xp_to_next_level,
				totalXp: progression.total_xp,
				currentWinStreak: progression.current_win_streak,
				bestWinStreak: progression.best_win_streak,
			}
			: null,
		achievements: userAchievements.map(a => ({
			...a,
			unlockedAt: a.unlockedAt?.toISOString() ?? null,
		})),
	};
};
