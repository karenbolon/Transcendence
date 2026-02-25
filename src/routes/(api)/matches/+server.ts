import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { games, users } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { processMatchProgression } from '$lib/server/progression';

const matchResultSchema = z.object({
	// Game mode: how the game was played
	gameMode: z.enum(['local', 'computer']),

	// Player 2 info
	// In 'local' mode: a custom name (or "Guest")
	// In 'computer' mode: always "Computer"
	player2Name: z.string().min(1).max(100),

	// Scores — must be non-negative integers
	player1Score: z.number().int().min(0),
	player2Score: z.number().int().min(0),

	// Who won: 'player1' or 'player2'
	winner: z.enum(['player1', 'player2']),

	// Settings that were used
	winScore: z.number().int().refine(
		(val) => [3, 5, 7, 11].includes(val),
		{ message: 'Win score must be 3, 5, 7, or 11' }
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
	{ message: 'One score must equal the win score' }
).refine(
	// The winner's score must be the winScore
	(data) => {
		if (data.winner === 'player1') return data.player1Score === data.winScore;
		return data.player2Score === data.winScore;
	},
	{ message: 'Winner must have the winning score' }
);

export const POST: RequestHandler = async ({ request, locals }) => {

	if (!locals.user) {
		return json({ error: 'You must be logged in to save match results' }, { status: 401 });
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
		winnerId = null;  // Guest/Computer has no user ID
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

			return { match, progression };
		});

		return json({
			success: true,
			matchId: txResult.match.id,
			message: `Match saved! ${winnerName} wins ${data.player1Score}-${data.player2Score}`,
			progression: txResult.progression,
		}, { status: 201 });

	} catch (err) {
		console.error('Failed to save match:', err);
		return json({ error: 'Failed to save match result' }, { status: 500 });
	}
};