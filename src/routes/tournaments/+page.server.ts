import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { tournaments, tournamentParticipants, users } from '$lib/server/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');

	const rows = await db
		.select({
			id: tournaments.id,
			name: tournaments.name,
			status: tournaments.status,
			maxPlayers: tournaments.max_players,
			createdBy: tournaments.created_by,
			creatorUsername: users.username,
			winnerId: tournaments.winner_id,
			startedAt: tournaments.started_at,
			createdAt: tournaments.created_at,
			participantCount: sql<number>`(
				SELECT count(*) FROM tournament_participants
				WHERE tournament_id = ${tournaments.id}
			)::int`,
		})
		.from(tournaments)
		.innerJoin(users, eq(users.id, tournaments.created_by))
		.orderBy(desc(tournaments.created_at))
		.limit(50);

	return {
		tournaments: rows,
		userId: Number(locals.user.id),
	};
};