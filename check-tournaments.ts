import { db } from './src/lib/server/db';
import { tournaments, tournamentParticipants, users } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function checkTournaments() {
	try {
		// Get all tournaments with their participant counts
		const allTournaments = await db
			.select({
				id: tournaments.id,
				name: tournaments.name,
				status: tournaments.status,
				createdBy: tournaments.created_by,
				winnerId: tournaments.winner_id,
				currentRound: tournaments.current_round,
				startedAt: tournaments.started_at,
				finishedAt: tournaments.finished_at,
			})
			.from(tournaments)
			.orderBy(tournaments.id);

		console.log('\n=== ALL TOURNAMENTS ===\n');
		for (const t of allTournaments) {
			console.log(`Tournament #${t.id}: "${t.name}"`);
			console.log(`  Status: ${t.status}`);
			console.log(`  Started: ${t.startedAt}`);
			console.log(`  Finished: ${t.finishedAt || 'N/A'}`);
			console.log(`  Current Round: ${t.currentRound}`);
			console.log(`  Winner ID: ${t.winnerId || 'N/A'}`);

			// Get participants
			const participants = await db
				.select({
					userId: tournamentParticipants.user_id,
					username: users.username,
					status: tournamentParticipants.status,
					placement: tournamentParticipants.placement,
				})
				.from(tournamentParticipants)
				.innerJoin(users, eq(users.id, tournamentParticipants.user_id))
				.where(eq(tournamentParticipants.tournament_id, t.id));

			console.log(`  Participants (${participants.length}):`);
			for (const p of participants) {
				console.log(`    - ${p.username} (ID: ${p.userId}) - Status: ${p.status}, Placement: ${p.placement || 'N/A'}`);
			}
			console.log();
		}

		// Summary
		const inProgress = allTournaments.filter(t => t.status === 'in_progress').length;
		const finished = allTournaments.filter(t => t.status === 'finished').length;
		const scheduled = allTournaments.filter(t => t.status === 'scheduled').length;

		console.log('=== SUMMARY ===');
		console.log(`Scheduled: ${scheduled}`);
		console.log(`In Progress: ${inProgress}`);
		console.log(`Finished: ${finished}`);
	} catch (error) {
		console.error('Error:', error);
		process.exit(1);
	}
}

checkTournaments();
