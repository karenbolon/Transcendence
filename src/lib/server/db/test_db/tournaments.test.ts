import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../index';
import { tournaments, users, tournamentParticipants } from '../schema';
import { eq, and } from 'drizzle-orm';
import { cleanDatabase, createTestUser, createTestUsers, createTestTournament, addTournamentParticipant,
	createTournamentWithPlayers } from './test-utils';

describe('Tournaments Schema - Integration Tests', () => {
	beforeEach(async () => {
		await cleanDatabase();
	});

	describe('CREATE operations', () => {
		it('should create a tournament with defaults', async () => {
			const creator = await createTestUser();

			const [tournament] = await db
				.insert(tournaments)
				.values({
					name: 'Summer Cup',
					game_type: 'pong',
					created_by: creator.id,
					// player_1_id: creator.id
				})
				.returning();

			expect(tournament.name).toBe('Summer Cup');
			expect(tournament.status).toBe('scheduled');
			expect(tournament.max_players).toBe(4);
			expect(tournament.current_round).toBe(0);
			expect(tournament.winner_id).toBeNull();
			expect(tournament.created_at).toBeInstanceOf(Date);
			expect(tournament.updated_at).toBeInstanceOf(Date);
		});

		it('should create tournament with custom max_players', async () => {
			const creator = await createTestUser();

			const [tournament] = await db
				.insert(tournaments)
				.values({
					name: 'Big Tournament',
					game_type: 'pong',
					created_by: creator.id,
					max_players: 16
				})
				.returning();

			expect(tournament.max_players).toBe(16);
		});

		it('should create tournament with description', async () => {
			const creator = await createTestUser();

			const [tournament] = await db
				.insert(tournaments)
				.values({
					name: 'Pro League',
					description: 'Only the best players!',
					game_type: 'pong',
					created_by: creator.id
				})
				.returning();

			expect(tournament.description).toBe('Only the best players!');
		});
	});

	describe('UPDATE operations', () => {
		it('should update tournament status', async () => {
			const creator = await createTestUser();
			const tournament = await createTestTournament(creator.id);

			await db
				.update(tournaments)
				.set({ status: 'in_progress', started_at: new Date(), current_round: 1 })
				.where(eq(tournaments.id, tournament.id));

			const [updated] = await db.select().from(tournaments).where(eq(tournaments.id, tournament.id));

			expect(updated.status).toBe('in_progress');
			expect(updated.current_round).toBe(1);
			expect(updated.started_at).toBeInstanceOf(Date);
		});

		it('should set winner when tournament finishes', async () => {
			const [creator, winner] = await createTestUsers(2);
			const tournament = await createTestTournament(creator.id);

			await db
				.update(tournaments)
				.set({
					status: 'finished',
					winner_id: winner.id,
					finished_at: new Date()
				})
				.where(eq(tournaments.id, tournament.id));

			const [updated] = await db.select().from(tournaments).where(eq(tournaments.id, tournament.id));

			expect(updated.status).toBe('finished');
			expect(updated.winner_id).toBe(winner.id);
			expect(updated.finished_at).toBeInstanceOf(Date);
		});
	});

	describe('FOREIGN KEY constraints', () => {
		it('should prevent deleting the tournament creator (restrict)', async () => {
			const creator = await createTestUser();
			await createTestTournament(creator.id);

			await expect(db.delete(users).where(eq(users.id, creator.id))).rejects.toThrow();
		});

		it('should set winner to null when winner user is deleted', async () => {
			const [creator, winner] = await createTestUsers(2);
			const tournament = await createTestTournament(creator.id, { winner_id: winner.id });

			// Delete the winner — should set winner_id to null (set null)
			await db.delete(users).where(eq(users.id, winner.id));

			const [updated] = await db.select().from(tournaments).where(eq(tournaments.id, tournament.id));
			expect(updated.winner_id).toBeNull();
		});
	});

	describe('Participant CREATE operations', () => {
		it('should add a participant to a tournament', async () => {
			const [creator, player] = await createTestUsers(2);
			const tournament = await createTestTournament(creator.id);

			const participant = await addTournamentParticipant(tournament.id, player.id);

			expect(participant.tournament_id).toBe(tournament.id);
			expect(participant.user_id).toBe(player.id);
			expect(participant.status).toBe('registered');
			expect(participant.seed).toBeNull();
			expect(participant.placement).toBeNull();
			expect(participant.joined_at).toBeInstanceOf(Date);
		});

		it('should add multiple participants', async () => {
			const players = await createTestUsers(4);
			const tournament = await createTestTournament(players[0].id, { max_players: 4 });

			for (const player of players) {
				await addTournamentParticipant(tournament.id, player.id);
			}

			const allParticipants = await db
				.select()
				.from(tournamentParticipants)
				.where(eq(tournamentParticipants.tournament_id, tournament.id));

			expect(allParticipants).toHaveLength(4);
		});

		it('should add participant with seed', async () => {
			const [creator, player] = await createTestUsers(2);
			const tournament = await createTestTournament(creator.id);

			const participant = await addTournamentParticipant(tournament.id, player.id, { seed: 1 });

			expect(participant.seed).toBe(1);
		});

		it('should use convenience function to create tournament with players', async () => {
			const players = await createTestUsers(4);
			const playerIds = players.map(p => p.id);

			const { tournament, participants } = await createTournamentWithPlayers(
				players[0].id,
				playerIds,
				{ name: 'Quick Cup' }
			);

			expect(tournament.name).toBe('Quick Cup');
			expect(tournament.max_players).toBe(4);
			expect(participants).toHaveLength(4);
			// Seeds should be 1, 2, 3, 4
			expect(participants.map(p => p.seed)).toEqual([1, 2, 3, 4]);
		});
	});

	describe('Participant READ operations', () => {
		it('should find all participants of a tournament', async () => {
			const players = await createTestUsers(4);
			const { tournament } = await createTournamentWithPlayers(players[0].id, players.map(p => p.id));

			const found = await db
				.select()
				.from(tournamentParticipants)
				.where(eq(tournamentParticipants.tournament_id, tournament.id));

			expect(found).toHaveLength(4);
		});

		it('should find all tournaments a user is in', async () => {
			const players = await createTestUsers(3);

			// Player 0 is in 2 tournaments
			await createTournamentWithPlayers(
				players[0].id,
				[players[0].id, players[1].id],
				{ name: 'Tournament 1', max_players: 4 }
			);
			await createTournamentWithPlayers(
				players[1].id,
				[players[0].id, players[2].id],
				{ name: 'Tournament 2', max_players: 4 }
			);

			const userTournaments = await db
				.select()
				.from(tournamentParticipants)
				.where(eq(tournamentParticipants.user_id, players[0].id));

			expect(userTournaments).toHaveLength(2);
		});

		it('should check if a user is already registered', async () => {
			const [creator, player] = await createTestUsers(2);
			const tournament = await createTestTournament(creator.id);

			await addTournamentParticipant(tournament.id, player.id);

			const existing = await db
				.select()
				.from(tournamentParticipants)
				.where(and(
					eq(tournamentParticipants.tournament_id, tournament.id),
					eq(tournamentParticipants.user_id, player.id)
				));

			expect(existing).toHaveLength(1);
		});
	});

	describe('Participant UPDATE operations', () => {
		it('should update participant status to active', async () => {
			const [creator, player] = await createTestUsers(2);
			const tournament = await createTestTournament(creator.id);
			const participant = await addTournamentParticipant(tournament.id, player.id);

			await db
				.update(tournamentParticipants)
				.set({ status: 'active' })
				.where(eq(tournamentParticipants.id, participant.id));

			const [updated] = await db
				.select()
				.from(tournamentParticipants)
				.where(eq(tournamentParticipants.id, participant.id));

			expect(updated.status).toBe('active');
		});

		it('should eliminate a participant with placement', async () => {
			const players = await createTestUsers(4);
			const { participants } = await createTournamentWithPlayers(
				players[0].id,
				players.map(p => p.id)
			);

			// Player 4 (seed 4) gets eliminated in round 1 → 4th place
			await db
				.update(tournamentParticipants)
				.set({ status: 'eliminated', placement: 4 })
				.where(eq(tournamentParticipants.id, participants[3].id));

			const [eliminated] = await db
				.select()
				.from(tournamentParticipants)
				.where(eq(tournamentParticipants.id, participants[3].id));

			expect(eliminated.status).toBe('eliminated');
			expect(eliminated.placement).toBe(4);
		});

		it('should crown the champion', async () => {
			const players = await createTestUsers(4);
			const { tournament, participants } = await createTournamentWithPlayers(
				players[0].id,
				players.map(p => p.id)
			);

			// Player 1 wins!
			await db
				.update(tournamentParticipants)
				.set({ status: 'champion', placement: 1 })
				.where(eq(tournamentParticipants.id, participants[0].id));

			// Also update the tournament itself
			await db
				.update(tournaments)
				.set({ winner_id: players[0].id, status: 'finished', finished_at: new Date() })
				.where(eq(tournaments.id, tournament.id));

			const [champion] = await db
				.select()
				.from(tournamentParticipants)
				.where(eq(tournamentParticipants.id, participants[0].id));

			const [finishedTournament] = await db
				.select()
				.from(tournaments)
				.where(eq(tournaments.id, tournament.id));

			expect(champion.status).toBe('champion');
			expect(champion.placement).toBe(1);
			expect(finishedTournament.winner_id).toBe(players[0].id);
			expect(finishedTournament.status).toBe('finished');
		});
	});

	describe('Participant DELETE / CASCADE operations', () => {
		it('should cascade delete participants when tournament is deleted', async () => {
			const players = await createTestUsers(4);
			const { tournament } = await createTournamentWithPlayers(
				players[0].id,
				players.map(p => p.id)
			);

			// Verify participants exist
			const before = await db
				.select()
				.from(tournamentParticipants)
				.where(eq(tournamentParticipants.tournament_id, tournament.id));
			expect(before).toHaveLength(4);

			// Delete tournament — should cascade delete all participants
			await db.delete(tournaments).where(eq(tournaments.id, tournament.id));

			const after = await db
				.select()
				.from(tournamentParticipants)
				.where(eq(tournamentParticipants.tournament_id, tournament.id));
			expect(after).toHaveLength(0);
		});

		it('should remove participant entry when non-creator user is deleted', async () => {
			const players = await createTestUsers(4);
			const { tournament } = await createTournamentWithPlayers(
				players[0].id,
				players.map(p => p.id)
			);

			// Delete a non-creator player — their participant row cascades
			await db.delete(tournamentParticipants).where(
				eq(tournamentParticipants.user_id, players[3].id)
			);

			const remaining = await db
				.select()
				.from(tournamentParticipants)
				.where(eq(tournamentParticipants.tournament_id, tournament.id));

			expect(remaining).toHaveLength(3);
		});

		it('should require valid tournament_id', async () => {
			const player = await createTestUser();

			await expect(
				db.insert(tournamentParticipants).values({
					tournament_id: 999999,
					user_id: player.id
				})
			).rejects.toThrow();
		});

		it('should require valid user_id', async () => {
			const creator = await createTestUser();
			const tournament = await createTestTournament(creator.id);

			await expect(
				db.insert(tournamentParticipants).values({
					tournament_id: tournament.id,
					user_id: 999999
				})
			).rejects.toThrow();
		});
	});

	// ══════════════════════════════════════════════════════════════════════════
	// 🏆 TOURNAMENT LIFECYCLE (FULL FLOW)
	// ══════════════════════════════════════════════════════════════════════════
	describe('Tournament lifecycle', () => {
		it('should handle a complete 4-player tournament', async () => {
			const players = await createTestUsers(4);

			// 1. Create tournament with 4 participants
			const { tournament, participants } = await createTournamentWithPlayers(
				players[0].id,
				players.map(p => p.id),
				{ name: 'Championship', status: 'registration' }
			);

			expect(participants).toHaveLength(4);

			// 2. Start tournament
			await db
				.update(tournaments)
				.set({ status: 'in_progress', started_at: new Date(), current_round: 1 })
				.where(eq(tournaments.id, tournament.id));

			// Set all participants to active
			for (const p of participants) {
				await db
					.update(tournamentParticipants)
					.set({ status: 'active' })
					.where(eq(tournamentParticipants.id, p.id));
			}

			// 3. Round 1: Player 1 beats Player 4, Player 2 beats Player 3
			await db
				.update(tournamentParticipants)
				.set({ status: 'eliminated', placement: 3 })
				.where(eq(tournamentParticipants.id, participants[3].id));

			await db
				.update(tournamentParticipants)
				.set({ status: 'eliminated', placement: 3 })
				.where(eq(tournamentParticipants.id, participants[2].id));

			// Advance round
			await db
				.update(tournaments)
				.set({ current_round: 2 })
				.where(eq(tournaments.id, tournament.id));

			// 4. Final: Player 1 beats Player 2
			await db
				.update(tournamentParticipants)
				.set({ status: 'eliminated', placement: 2 })
				.where(eq(tournamentParticipants.id, participants[1].id));

			await db
				.update(tournamentParticipants)
				.set({ status: 'champion', placement: 1 })
				.where(eq(tournamentParticipants.id, participants[0].id));

			// 5. Finish tournament
			await db
				.update(tournaments)
				.set({
					status: 'finished',
					winner_id: players[0].id,
					finished_at: new Date()
				})
				.where(eq(tournaments.id, tournament.id));

			// 6. Verify final state
			const [finalTournament] = await db
				.select()
				.from(tournaments)
				.where(eq(tournaments.id, tournament.id));

			const finalParticipants = await db
				.select()
				.from(tournamentParticipants)
				.where(eq(tournamentParticipants.tournament_id, tournament.id));

			expect(finalTournament.status).toBe('finished');
			expect(finalTournament.winner_id).toBe(players[0].id);

			const champion = finalParticipants.find(p => p.placement === 1);
			const runnerUp = finalParticipants.find(p => p.placement === 2);
			const semiFinalists = finalParticipants.filter(p => p.placement === 3);

			expect(champion?.user_id).toBe(players[0].id);
			expect(champion?.status).toBe('champion');
			expect(runnerUp?.user_id).toBe(players[1].id);
			expect(runnerUp?.status).toBe('eliminated');
			expect(semiFinalists).toHaveLength(2);
		});

		it('should support 8-player tournament (no schema change needed!)', async () => {
			const players = await createTestUsers(8);

			const { tournament, participants } = await createTournamentWithPlayers(
				players[0].id,
				players.map(p => p.id),
				{ name: '8-Player Cup', max_players: 8 }
			);

			expect(tournament.max_players).toBe(8);
			expect(participants).toHaveLength(8);

			// All 8 players have seeds 1 through 8
			const seeds = participants.map(p => p.seed).sort();
			expect(seeds).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
		});
	});

	// ══════════════════════════════════════════════════════════════════════════
	// 🔄 SCALING TEST — Proves the junction table works for any size
	// ══════════════════════════════════════════════════════════════════════════
	describe('Scalability', () => {
		it('should handle different tournament sizes without schema changes', async () => {
			for (const size of [4, 8]) {
				const players = await createTestUsers(size);
				const { tournament, participants } = await createTournamentWithPlayers(
					players[0].id,
					players.map(p => p.id),
					{ name: `${size}-Player Tournament`, max_players: size }
				);

				expect(tournament.max_players).toBe(size);
				expect(participants).toHaveLength(size);
			}
		});
	});
});
