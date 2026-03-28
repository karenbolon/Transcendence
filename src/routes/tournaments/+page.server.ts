import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { tournaments, tournamentParticipants, users } from '$lib/server/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');

	const userId = Number(locals.user.id);

	const rows = await db
		.select({
			id: tournaments.id,
			name: tournaments.name,
			status: tournaments.status,
			maxPlayers: tournaments.max_players,
			speedPreset: tournaments.speed_preset,
			winScore: tournaments.win_score,
			createdBy: tournaments.created_by,
			creatorUsername: users.username,
			winnerId: tournaments.winner_id,
			startedAt: tournaments.started_at,
			finishedAt: tournaments.finished_at,
			createdAt: tournaments.created_at,
			participantCount: sql<number>`(
				SELECT count(*) FROM tournament_participants
				WHERE tournament_id = ${tournaments.id}
			)::int`,
			winnerUsername: sql<string | null>`(
				SELECT username FROM users
				WHERE id = ${tournaments.winner_id}
			)`,
			winnerAvatarUrl: sql<string | null>`(
				SELECT avatar_url FROM users
				WHERE id = ${tournaments.winner_id}
			)`,
			myPlacement: sql<number | null>`(
				SELECT placement FROM tournament_participants
				WHERE tournament_id = ${tournaments.id} AND user_id = ${userId}
			)`,
			myXpEarned: sql<number | null>`(
				SELECT xp_earned FROM tournament_participants
				WHERE tournament_id = ${tournaments.id} AND user_id = ${userId}
			)`,
		})
		.from(tournaments)
		.innerJoin(users, eq(users.id, tournaments.created_by))
		.orderBy(desc(tournaments.created_at))
		.limit(50);

	// Find if user is currently in an active tournament
	const myActiveTournament = await db
		.select({
			id: tournaments.id,
			name: tournaments.name,
			status: tournaments.status,
		})
		.from(tournamentParticipants)
		.innerJoin(tournaments, eq(tournaments.id, tournamentParticipants.tournament_id))
		.where(eq(tournamentParticipants.user_id, userId))
		.then(rows => rows.find(r => r.status === 'in_progress') ?? null);

	return {
		tournaments: rows,
		userId,
		myActiveTournament,
	};
};