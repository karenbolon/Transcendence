import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { games, users } from '$lib/server/db/schema';
import { eq, sql, and, or, desc } from 'drizzle-orm';
import { z } from 'zod';
import { processMatchProgression } from '$lib/server/progression';
import { apiLogger } from '$lib/server/logger';


//added GET for pagination and match history
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const userId = Number(locals.user.id);
	const rawLimit = Number(url.searchParams.get('limit'));
	const limit =
		Number.isFinite(rawLimit) && rawLimit > 0
			? Math.min(Math.floor(rawLimit), 100)
			: 10;

	const rows = await db.select().from(games)
		.where(and(
			or(eq(games.player1_id, userId), eq(games.player2_id, userId)),
			eq(games.status, 'finished')
		))
		.orderBy(desc(games.finished_at))
		.limit(limit + 1);

	const hasMore = rows.length > limit;
	return json({ matches: rows.slice(0, limit), hasMore, limit });
};

const matchResultSchema = z.object({
	// Game mode: how the game was played
	gameMode: z.enum(['local', 'computer', 'online']),

	// Player 2 info
	// In 'local' mode: a custom name (or "Guest")
	// In 'computer' mode: always "Computer"
	player2Name: z.string().min(1).max(100),
	player2Id: z.number().int().positive().optional(),

	// Scores — must be non-negative integers
	player1Score: z.number().int().min(0),
	player2Score: z.number().int().min(0),

	// Who won: 'player1' or 'player2'
	winner: z.enum(['player1', 'player2']),

	// Settings that were used
	winScore: z.number().int().refine(
		(val) => [3, 5, 7, 11].includes(val),
		{ message: 'matches.validation.win_score_invalid' }
	),
	speedPreset: z.enum(['chill', 'normal', 'fast']),

	// Duration in seconds (optional, might not be tracked yet)
	durationSeconds: z.number().int().min(0).optional(),

	// Progression stats from the game engine
	ballReturns: z.number().int().min(0).max(10000).optional().default(0),
	maxDeficit: z.number().int().min(0).max(100).optional().default(0),
	reachedDeuce: z.boolean().optional().default(false),
}).refine(
	// At least one score must equal winScore (someone won!)
	(data) => data.player1Score === data.winScore || data.player2Score === data.winScore,
	{ message: 'matches.validation.score_must_equal_win_score' }
).refine(
	// The winner's score must be the winScore
	(data) => {
		if (data.winner === 'player1') return data.player1Score === data.winScore;
		return data.player2Score === data.winScore;
	},
	{ message: 'matches.validation.winner_must_have_winning_score' }
);

export const POST: RequestHandler = async ({ request, locals }) => {

	if (!locals.user) {
		return json({ error: 'Failed to save match (you must be logged in to save match)' }, { status: 401 });
	}

	// ── PARSE + VALIDATE BODY ──────────────────────────────────
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const result = matchResultSchema.safeParse(body);
	if (!result.success) {
		return json({
			error: 'Invalid match data',
			details: result.error.flatten().fieldErrors
		}, { status: 400 });
	}

	const data = result.data;
	const user = locals.user;
	const userId = Number(user.id);
	const player1Name = user.username;
	let winnerName: string;
	let winnerId: number | null;

	if (data.winner === 'player1') {
		winnerName = player1Name;
		winnerId = userId;
	} else {
		// Player 2 won
		winnerName = data.player2Name;
		winnerId = data.player2Id ?? null;
		// Real user ID for online, null for local/computer
		// Guest/Computer has no user ID
	}

	// ── SAVE TO DATABASE ───────────────────────────────────────
	// Use a transaction so the game insert, user stats update,
	// and progression update either all succeed or all roll back.
	try {
		const finishedAt = new Date();
		const durationMs = (data.durationSeconds ?? 0) * 1000;
		const startedAt = new Date(finishedAt.getTime() - durationMs);

		const txResult = await db.transaction(async (tx) => {
			// 1. Insert the game record
			const [match] = await tx.insert(games).values({
				type: 'pong',
				status: 'finished',
				game_mode: data.gameMode,

				player1_id: userId,
				player2_id: null,
				player2_name: data.player2Name,

				player1_score: data.player1Score,
				player2_score: data.player2Score,

				winner_id: winnerId,
				winner_name: winnerName,

				winner_score: data.winScore,
				speed_preset: data.speedPreset,

				duration_seconds: data.durationSeconds ?? null,
				started_at: startedAt,
				finished_at: finishedAt,
			}).returning();

			// 2. Update the user's stats (games_played, wins, losses)
			const userWon = data.winner === 'player1';
			await tx.update(users)
				.set({
					games_played: sql`${users.games_played} + 1`,
					wins: userWon ? sql`${users.wins} + 1` : users.wins,
					losses: userWon ? users.losses : sql`${users.losses} + 1`,
					updated_at: finishedAt,
				})
				.where(eq(users.id, userId));

			// 3. Process progression (XP, levels, achievements)
			const progression = await processMatchProgression(tx, userId, {
				won: userWon,
				player1Score: data.player1Score,
				player2Score: data.player2Score,
				winScore: data.winScore,
				speedPreset: data.speedPreset,
				ballReturns: data.ballReturns,
				maxDeficit: data.maxDeficit,
				reachedDeuce: data.reachedDeuce,
			});

			// 4. Auto-detect preferences: if 4+ of last 6 games use same settings, save as default
			const recentGames = await tx
				.select({
					speed_preset: games.speed_preset,
					winner_score: games.winner_score,
				})
				.from(games)
				.where(
					and(
						or(eq(games.player1_id, userId), eq(games.player2_id, userId)),
						eq(games.status, 'finished')
					)
				)
				.orderBy(desc(games.finished_at))
				.limit(6);

			if (recentGames.length >= 4) {
				// Count occurrences of each speed+score combo
				const comboCounts = new Map<string, number>();
				for (const g of recentGames) {
					const key = `${g.speed_preset}:${g.winner_score}`;
					comboCounts.set(key, (comboCounts.get(key) ?? 0) + 1);
				}

				for (const [key, count] of comboCounts) {
					if (count >= 4) {
						const [speedPreset, winScoreStr] = key.split(':');
						const winScore = Number(winScoreStr);
						await tx.update(users)
							.set({
								game_preferences: { speedPreset, winScore },
							})
							.where(eq(users.id, userId));
						break;
					}
				}
			}

			return { match, progression };
		});

		return json({
			success: true,
			matchId: txResult.match.id,
			messageKey: 'matches.success.saved_match',
			messageParams: {
				winnerName,
				score: `${data.player1Score}-${data.player2Score}`
			},
			progression: txResult.progression,
		}, { status: 201 });

	} catch (err) {
		apiLogger.error({ err }, 'Failed to save match');
		return json({ error: 'Failed to save match (you must be logged in to save match)' }, { status: 500 });
	}
};