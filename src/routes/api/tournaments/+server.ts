import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { tournaments, tournamentParticipants, users } from '$lib/server/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const status = url.searchParams.get('status'); // 'scheduled', 'in_progress', 'finished'

	const conditions = status ? [eq(tournaments.status, status)] : [];

	const rows = await db
		.select({
			id: tournaments.id,
			name: tournaments.name,
			status: tournaments.status,
			maxPlayers: tournaments.max_players,
			currentRound: tournaments.current_round,
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
		})
		.from(tournaments)
		.innerJoin(users, eq(users.id, tournaments.created_by))
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(desc(tournaments.created_at))
		.limit(50);

	return json({ tournaments: rows });
};