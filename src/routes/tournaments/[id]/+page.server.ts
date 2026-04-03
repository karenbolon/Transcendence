import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { tournaments, tournamentParticipants, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { getActiveTournament } from '$lib/server/tournament/TournamentManager';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) throw redirect(302, '/login');

	const tournamentId = Number(params.id);

	const [tournament] = await db.select().from(tournaments)
		.where(eq(tournaments.id, tournamentId));
	if (!tournament) throw redirect(302, '/tournaments');

	const participants = await db.select({
		userId: tournamentParticipants.user_id,
		username: users.username,
		name: users.name,
		avatarUrl: users.avatar_url,
		wins: users.wins,
		seed: tournamentParticipants.seed,
		status: tournamentParticipants.status,
		placement: tournamentParticipants.placement,
		xpEarned: tournamentParticipants.xp_earned,
	})
		.from(tournamentParticipants)
		.innerJoin(users, eq(users.id, tournamentParticipants.user_id))
		.where(eq(tournamentParticipants.tournament_id, tournamentId));

	const active = getActiveTournament(tournamentId);

	// Use in-memory bracket if active, otherwise fall back to DB
	const bracket = active?.bracket ?? (tournament.bracket_data as any[] | null) ?? null;

	const userId = Number(locals.user!.id);
	const myParticipant = participants.find((p) => p.userId === userId) ?? null;
	const isActiveParticipant = myParticipant
		? myParticipant.status === 'registered' || myParticipant.status === 'active'
		: false;

	return {
		tournament: {
			id: tournament.id,
			name: tournament.name,
			status: tournament.status,
			maxPlayers: tournament.max_players,
			speedPreset: tournament.speed_preset as string,
			winScore: tournament.win_score,
			currentRound: tournament.current_round,
			createdBy: tournament.created_by,
			winnerId: tournament.winner_id,
			startedAt: tournament.started_at?.toISOString() ?? null,
			finishedAt: tournament.finished_at?.toISOString() ?? null,
		},
		participants: participants.map(p => ({
			...p,
			avatarUrl: p.avatarUrl,
		})),
		bracket,
		userId,
		myParticipantStatus: myParticipant?.status ?? null,
		isCreator: tournament.created_by === userId,
		isParticipant: isActiveParticipant,
	};
};
