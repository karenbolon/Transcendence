import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { games } from '$lib/server/db/schema';
import { z } from 'zod';

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
	const player1Name = locals.user.username;
	let winnerName: string;
	let winnerId: number | null;

	if (data.winner === 'player1') {
		winnerName = player1Name;
		winnerId = locals.user.id;
	} else {
		// Player 2 won
		winnerName = data.player2Name;
		winnerId = null;  // Guest/Computer has no user ID
	}

	// ── SAVE TO DATABASE ───────────────────────────────────────
	try {
		const [match] = await db.insert(games).values({
			type: 'pong',
			status: 'finished',
			game_mode: data.gameMode,

			player1_id: locals.user.id,
			player2_id: null,              // null for local/computer games
			player2_name: data.player2Name,

			player1_score: data.player1Score,
			player2_score: data.player2Score,

			winner_id: winnerId,
			winner_name: winnerName,

			winner_score: data.winScore,
			speed_preset: data.speedPreset,

			duration_seconds: data.durationSeconds ?? null,
			started_at: new Date(),        // We'll improve this with actual timing later
			finished_at: new Date(),
		}).returning();

		return json({
			success: true,
			matchId: match.id,
			message: `Match saved! ${winnerName} wins ${data.player1Score}-${data.player2Score}`
		}, { status: 201 });

	} catch (err) {
		console.error('Failed to save match:', err);
		return json({ error: 'Failed to save match result' }, { status: 500 });
	}
};