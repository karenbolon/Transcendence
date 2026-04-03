import { z } from 'zod';

const tournamentSettingsSchema = z.object({
	speedPreset: z.enum(['chill', 'normal', 'fast']),
	winScore: z.number().int().positive(),
});

const tournamentCreateSchema = z.object({
	name: z.string(),
	maxPlayers: z.number().int(),
	settings: tournamentSettingsSchema.optional(),
});

const tournamentIdSchema = z.object({
	tournamentId: z.number().int().positive(),
});

export function registerTournamentHandlers({
	socket,
	io,
	sql,
	logger,
	userId,
	username,
	activeTournaments,
	emitToUser,
	emitToTournamentParticipants,
	generateBracketJS,
	startTournamentRoundMatches,
}) {
	function emitTournamentError(message) {
		socket.emit('tournament:error', { message });
	}

	async function getTournamentById(tournamentId) {
		const [tournament] = await sql`SELECT * FROM tournaments WHERE id = ${tournamentId}`;
		return tournament;
	}

	function parseOrTournamentError(schema, data, message = 'Invalid tournament request') {
		const parsed = schema.safeParse(data);
		if (!parsed.success) {
			emitTournamentError(message);
			return null;
		}
		return parsed.data;
	}

	socket.on('tournament:create', async (data) => {
		const payload = parseOrTournamentError(tournamentCreateSchema, data);
		if (!payload) return;
		if (!payload.name?.trim()) { emitTournamentError('Tournament name is required'); return; }
		if (![4, 8, 16].includes(payload.maxPlayers)) { emitTournamentError('Max players must be 4, 8, or 16'); return; }

		const settings = payload.settings ?? { speedPreset: 'normal', winScore: 5 };
		const [tournament] = await sql`
			INSERT INTO tournaments (name, game_type, status, created_by, max_players, speed_preset, win_score)
			VALUES (${payload.name.trim()}, 'pong', 'scheduled', ${userId}, ${payload.maxPlayers}, ${settings.speedPreset}, ${settings.winScore})
			RETURNING id
		`;

		// Auto-join creator
		await sql`
			INSERT INTO tournament_participants (tournament_id, user_id, seed, status)
			VALUES (${tournament.id}, ${userId}, 1, 'registered')
		`;

		socket.emit('tournament:created', { tournamentId: tournament.id });
		io.emit('tournament:list-updated');
	});

	socket.on('tournament:join', async (data) => {
		const payload = parseOrTournamentError(tournamentIdSchema, data);
		if (!payload) return;
		const tournament = await getTournamentById(payload.tournamentId);
		if (!tournament) { emitTournamentError('Tournament not found'); return; }
		if (tournament.status !== 'scheduled') { emitTournamentError('Tournament already started'); return; }

		const existing = await sql`SELECT id FROM tournament_participants WHERE tournament_id = ${payload.tournamentId} AND user_id = ${userId}`;
		if (existing.length > 0) { emitTournamentError('Already joined'); return; }

		const participants = await sql`SELECT id FROM tournament_participants WHERE tournament_id = ${payload.tournamentId}`;
		if (participants.length >= tournament.max_players) { emitTournamentError('Tournament is full'); return; }

		await sql`
			INSERT INTO tournament_participants (tournament_id, user_id, seed, status)
			VALUES (${payload.tournamentId}, ${userId}, ${participants.length + 1}, 'registered')
		`;

		socket.emit('tournament:joined', { tournamentId: payload.tournamentId });
		io.emit('tournament:player-joined', { tournamentId: payload.tournamentId, userId, username });
	});

	socket.on('tournament:leave', async (data) => {
		const payload = parseOrTournamentError(tournamentIdSchema, data);
		if (!payload) return;
		const tournament = await getTournamentById(payload.tournamentId);
		if (!tournament || tournament.status !== 'scheduled') { emitTournamentError('Cannot leave tournament'); return; }

		await sql`DELETE FROM tournament_participants WHERE tournament_id = ${payload.tournamentId} AND user_id = ${userId}`;
		socket.emit('tournament:left', { tournamentId: payload.tournamentId });
		io.emit('tournament:player-left', { tournamentId: payload.tournamentId, userId, username });
	});

	socket.on('tournament:cancel', async (data) => {
		try {
			const payload = parseOrTournamentError(tournamentIdSchema, data);
			if (!payload) return;
			const tournament = await getTournamentById(payload.tournamentId);
			if (!tournament || tournament.created_by !== userId) {
				emitTournamentError('Cannot cancel tournament');
				return;
			}
			if (tournament.status !== 'scheduled') {
				emitTournamentError('Cannot cancel a started tournament');
				return;
			}

			// Fetch participants before deleting so we can notify them
			const participants = await sql`SELECT user_id FROM tournament_participants WHERE tournament_id = ${payload.tournamentId}`;

			await sql`DELETE FROM tournament_participants WHERE tournament_id = ${payload.tournamentId}`;
			await sql`DELETE FROM tournaments WHERE id = ${payload.tournamentId}`;

			// Notify each participant individually (toast even if on another page)
			for (const p of participants) {
				emitToUser(Number(p.user_id), 'tournament:cancelled', {
					tournamentId: payload.tournamentId,
					tournamentName: tournament.name,
				});
			}

			io.emit('tournament:list-updated');
		} catch (err) {
			logger?.error({ err, tournamentId: data?.tournamentId, userId }, 'Tournament cancel failed');
			emitTournamentError('Failed to cancel tournament');
		}
	});

	socket.on('tournament:start', async (data) => {
		const payload = parseOrTournamentError(tournamentIdSchema, data);
		if (!payload) return;
		const tournament = await getTournamentById(payload.tournamentId);
		if (!tournament || tournament.created_by !== userId) { emitTournamentError('Only the creator can start'); return; }
		if (tournament.status !== 'scheduled') { emitTournamentError('Tournament already started'); return; }

		const participants = await sql`
			SELECT tp.user_id, tp.seed, u.username
			FROM tournament_participants tp
			JOIN users u ON u.id = tp.user_id
			WHERE tp.tournament_id = ${payload.tournamentId}
			ORDER BY tp.seed
		`;
		if (participants.length < 2) { emitTournamentError('Need at least 2 players'); return; }

		const players = participants.map(p => ({ id: Number(p.user_id), username: p.username }));
		const bracket = generateBracketJS(players);

		const playerMap = new Map();
		for (const p of players) playerMap.set(p.id, p.username);

		activeTournaments.set(payload.tournamentId, {
			id: payload.tournamentId, bracket, settings: { speedPreset: tournament.speed_preset, winScore: tournament.win_score },
			createdBy: userId, playerMap,
		});

		await sql`UPDATE tournaments SET status = 'in_progress', current_round = 1, started_at = NOW() WHERE id = ${payload.tournamentId}`;
		await sql`UPDATE tournament_participants SET status = 'active' WHERE tournament_id = ${payload.tournamentId}`;

		emitToTournamentParticipants(payload.tournamentId, 'tournament:started', { tournamentId: payload.tournamentId, bracket });
		io.emit('tournament:list-updated');
		await startTournamentRoundMatches(payload.tournamentId, 1);
	});

	socket.on('tournament:status', (data) => {
		const payload = parseOrTournamentError(tournamentIdSchema, data);
		if (!payload) return;
		const tourney = activeTournaments.get(payload.tournamentId);
		if (!tourney) { emitTournamentError('Tournament not active'); return; }
		socket.emit('tournament:status', { tournamentId: payload.tournamentId, bracket: tourney.bracket });
	});
}
