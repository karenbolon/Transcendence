import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { tournaments, tournamentParticipants, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getActiveTournament } from '$lib/server/tournament/TournamentManager';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const tournamentId = Number(params.id);

	const [tournament] = await db.select().from(tournaments)
		.where(eq(tournaments.id, tournamentId));
	if (!tournament) return json({ error: 'Not found' }, { status: 404 });

	// Get participants with user info
	const participants = await db.select({
		userId: tournamentParticipants.user_id,
		username: users.username,
		name: users.name,
		avatarUrl: users.avatar_url,
		seed: tournamentParticipants.seed,
		status: tournamentParticipants.status,
		placement: tournamentParticipants.placement,
	})
		.from(tournamentParticipants)
		.innerJoin(users, eq(users.id, tournamentParticipants.user_id))
		.where(eq(tournamentParticipants.tournament_id, tournamentId));

	// Get bracket if tournament is active
	const active = getActiveTournament(tournamentId);

	return json({
		tournament: {
			id: tournament.id,
			name: tournament.name,
			status: tournament.status,
			maxPlayers: tournament.max_players,
			currentRound: tournament.current_round,
			createdBy: tournament.created_by,
			winnerId: tournament.winner_id,
			startedAt: tournament.started_at,
			finishedAt: tournament.finished_at,
		},
		participants,
		bracket: active?.bracket ?? null,
		isCreator: tournament.created_by === Number(user.id),
		isParticipant: participants.some(p => p.userId === Number(user.id)),
	});
};