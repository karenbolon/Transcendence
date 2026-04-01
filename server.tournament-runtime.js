export function createTournamentRuntime({
	activeTournaments,
	emitToUser,
	emitToUsers,
	emitToTournamentParticipants,
	createGameRoom,
	getGameRoom,
	destroyGameRoom,
	sql,
	io,
	logger = null,
}) {
	function nextPowerOf2(n) { let p = 1; while (p < n) p *= 2; return p; }

	function seedPairingArr(players) {
		const n = players.length;
		if (n <= 2) return players;
		const result = new Array(n);
		for (let i = 0; i < n / 2; i++) {
			result[i * 2] = players[i];
			result[i * 2 + 1] = players[n - 1 - i];
		}
		return result;
	}

	function generateBracketJS(players) {
		const size = nextPowerOf2(players.length);
		const totalRounds = Math.log2(size);
		const rounds = [];
		const seeded = [...players];
		while (seeded.length < size) seeded.push(null);
		const paired = seedPairingArr(seeded);

		const round1 = [];
		for (let i = 0; i < paired.length; i += 2) {
			const p1 = paired[i];
			const p2 = paired[i + 1];
			const isBye = p1 === null || p2 === null;
			const winner = isBye ? (p1 ?? p2) : null;
			round1.push({
				matchIndex: i / 2,
				player1Id: p1?.id ?? null,
				player2Id: p2?.id ?? null,
				player1Username: p1?.username ?? null,
				player2Username: p2?.username ?? null,
				winnerId: winner?.id ?? null,
				status: isBye ? 'bye' : 'pending',
			});
		}
		rounds.push({ round: 1, matches: round1 });

		let matchesInRound = round1.length / 2;
		for (let r = 2; r <= totalRounds; r++) {
			const rm = [];
			for (let i = 0; i < matchesInRound; i++) {
				rm.push({
					matchIndex: i,
					player1Id: null,
					player2Id: null,
					player1Username: null,
					player2Username: null,
					winnerId: null,
					status: 'pending',
				});
			}
			rounds.push({ round: r, matches: rm });
			matchesInRound /= 2;
		}

		const round2 = rounds.find((r) => r.round === 2);
		if (round2) {
			for (const match of round1) {
				if (match.status === 'bye' && match.winnerId) {
					const nextMatchIndex = Math.floor(match.matchIndex / 2);
					const nextMatch = round2.matches[nextMatchIndex];
					if (nextMatch) {
						const winner = players.find((p) => p.id === match.winnerId);
						if (match.matchIndex % 2 === 0) {
							nextMatch.player1Id = match.winnerId;
							nextMatch.player1Username = winner?.username ?? null;
						} else {
							nextMatch.player2Id = match.winnerId;
							nextMatch.player2Username = winner?.username ?? null;
						}
					}
				}
			}
		}
		return rounds;
	}

	function countTournamentWins(bracket, userId) {
		return bracket.reduce((count, round) => count + round.matches.filter((m) => m.winnerId === userId).length, 0);
	}

	function getNextViewerMatch(roundMatches) {
		return roundMatches.find((m) => m.player1Id && m.player2Id && m.status === 'pending')
			?? roundMatches.find((m) => m.player1Id || m.player2Id)
			?? null;
	}

	function getRoundName(round, totalRounds) {
		const fromFinal = totalRounds - round;
		if (fromFinal === 0) return 'Final';
		if (fromFinal === 1) return 'Semifinals';
		if (fromFinal === 2) return 'Quarterfinals';
		return `Round ${round}`;
	}

	async function startTournamentRoundMatches(tournamentId, round) {
		const tourney = activeTournaments.get(tournamentId);
		if (!tourney) return;
		const roundData = tourney.bracket.find((r) => r.round === round);
		if (!roundData) return;

		for (const match of roundData.matches) {
			if (match.status !== 'pending' || !match.player1Id || !match.player2Id) continue;
			match.status = 'playing';
			const roomId = `tournament-${tournamentId}-r${round}-m${match.matchIndex}`;
			const p1Username = tourney.playerMap.get(match.player1Id) ?? 'Player';
			const p2Username = tourney.playerMap.get(match.player2Id) ?? 'Player';

			createGameRoom(
				roomId,
				{ userId: match.player1Id, username: p1Username },
				{ userId: match.player2Id, username: p2Username },
				tourney.settings,
			);

			const gameData = {
				roomId,
				player1: { userId: match.player1Id, username: p1Username },
				player2: { userId: match.player2Id, username: p2Username },
				settings: tourney.settings,
				tournamentId,
				round,
				matchIndex: match.matchIndex,
			};
			emitToUsers([match.player1Id, match.player2Id], 'tournament:match-ready', gameData);
			emitToUsers([match.player1Id, match.player2Id], 'game:start', gameData);

			const capturedP1Id = match.player1Id;
			const capturedP2Id = match.player2Id;
			setTimeout(() => {
				const room = getGameRoom(roomId);
				if (!room) return;
				const p1Joined = room.player1.socketIds.size > 0;
				const p2Joined = room.player2.socketIds.size > 0;
				if (p1Joined && p2Joined) return;
				if (!p1Joined && !p2Joined) {
					if (logger) logger.warn({ roomId, tournamentId, round, matchIndex: match.matchIndex }, 'Tournament room expired with no joins');
					destroyGameRoom(roomId);
					return;
				}
				const absentId = p1Joined ? capturedP2Id : capturedP1Id;
				if (logger) logger.info({ roomId, absentId, tournamentId, round, matchIndex: match.matchIndex }, 'Auto-forfeit absent tournament player');
				room.forfeitByPlayer(absentId);
			}, 60000);
		}

		emitToTournamentParticipants(tournamentId, 'tournament:bracket-update', { tournamentId, bracket: tourney.bracket });
	}

	async function advanceTournamentWinner(tournamentId, round, matchIndex, winnerId, loserId, winnerScore, loserScore) {
		const tourney = activeTournaments.get(tournamentId);
		if (!tourney) return;

		const roundData = tourney.bracket.find((r) => r.round === round);
		if (!roundData) return;

		const match = roundData.matches[matchIndex];
		if (match) {
			match.winnerId = winnerId;
			match.status = 'finished';
			if (winnerScore !== undefined) {
				if (match.player1Id === winnerId) {
					match.player1Score = winnerScore;
					match.player2Score = loserScore;
				} else {
					match.player1Score = loserScore;
					match.player2Score = winnerScore;
				}
			}
		}

		const totalRounds = tourney.bracket.length;
		const placement = Math.pow(2, totalRounds - round) + 1 + matchIndex;
		await sql`UPDATE tournament_participants SET status = 'eliminated', placement = ${placement} WHERE tournament_id = ${tournamentId} AND user_id = ${loserId}`;

		const loserWins = countTournamentWins(tourney.bracket, loserId);
		const nextRound = tourney.bracket.find((r) => r.round === round + 1);
		let tournamentContinues = null;
		if (nextRound) {
			const nextMatchForViewer = getNextViewerMatch(nextRound.matches);
			if (nextMatchForViewer && nextMatchForViewer.player1Username && nextMatchForViewer.player2Username) {
				tournamentContinues = {
					player1Username: nextMatchForViewer.player1Username,
					player2Username: nextMatchForViewer.player2Username,
					roundName: getRoundName(round + 1, totalRounds),
				};
			}
		}

		if (nextRound) {
			emitToUser(loserId, 'tournament:eliminated', {
				tournamentId,
				round,
				placement,
				totalRounds,
				tournamentName: tourney.name,
				roundName: getRoundName(round, totalRounds),
				tournamentWins: loserWins,
				tournamentLosses: 1,
				tournamentContinues,
			});

			const nextMatchIndex = Math.floor(matchIndex / 2);
			const nextMatch = nextRound.matches[nextMatchIndex];
			if (nextMatch) {
				const winnerUsername = tourney.playerMap.get(winnerId) ?? 'Player';
				if (matchIndex % 2 === 0) {
					nextMatch.player1Id = winnerId;
					nextMatch.player1Username = winnerUsername;
				} else {
					nextMatch.player2Id = winnerId;
					nextMatch.player2Username = winnerUsername;
				}

				const nextOpponentId = matchIndex % 2 === 0 ? nextMatch.player2Id : nextMatch.player1Id;
				let nextOpponentInfo = null;
				if (nextOpponentId) {
					const [opponentUser] = await sql`SELECT wins FROM users WHERE id = ${nextOpponentId}`;
					const [opponentParticipant] = await sql`SELECT seed FROM tournament_participants WHERE tournament_id = ${tournamentId} AND user_id = ${nextOpponentId}`;
					nextOpponentInfo = {
						username: tourney.playerMap.get(nextOpponentId) ?? 'Player',
						wins: opponentUser?.wins ?? 0,
						seed: opponentParticipant?.seed ?? 0,
					};
				}

				const winnerTournamentWins = countTournamentWins(tourney.bracket, winnerId);

				emitToUser(winnerId, 'tournament:advanced', {
					tournamentId,
					round,
					nextRound: round + 1,
					nextMatchIndex,
					totalRounds,
					tournamentName: tourney.name,
					roundName: getRoundName(round, totalRounds),
					nextRoundName: getRoundName(round + 1, totalRounds),
					nextOpponent: nextOpponentInfo,
					tournamentWins: winnerTournamentWins,
				});

				if (nextMatch.player1Id && nextMatch.player2Id) {
					await startTournamentRoundMatches(tournamentId, round + 1);
				}
			}
		} else {
			await sql`UPDATE tournaments SET status = 'finished', winner_id = ${winnerId}, finished_at = NOW(), bracket_data = ${JSON.stringify(tourney.bracket)} WHERE id = ${tournamentId}`;
			await sql`UPDATE tournament_participants SET status = 'champion', placement = 1 WHERE tournament_id = ${tournamentId} AND user_id = ${winnerId}`;
			await sql`UPDATE tournament_participants SET placement = 2 WHERE tournament_id = ${tournamentId} AND user_id = ${loserId} AND (placement IS NULL OR placement > 2)`;

			const podiumRows = await sql`
				SELECT tp.user_id, tp.placement, u.username, u.avatar_url
				FROM tournament_participants tp
				JOIN users u ON u.id = tp.user_id
				WHERE tp.tournament_id = ${tournamentId}
				ORDER BY tp.placement
			`;
			const podium = podiumRows
				.filter((p) => p.placement !== null && p.placement <= 3)
				.map((p) => ({ userId: p.user_id, username: p.username, avatarUrl: p.avatar_url, placement: p.placement }));

			const championWins = countTournamentWins(tourney.bracket, winnerId);
			const runnerUpWins = countTournamentWins(tourney.bracket, loserId);

			emitToTournamentParticipants(tournamentId, 'tournament:finished', {
				tournamentId,
				winnerId,
				loserId,
				winnerUsername: tourney.playerMap.get(winnerId),
				tournamentName: tourney.name,
				round,
				totalRounds,
				roundName: getRoundName(round, totalRounds),
				podium,
				championWins,
				runnerUpWins,
				bracket: tourney.bracket,
			});
			activeTournaments.delete(tournamentId);
			io.emit('tournament:list-updated');
		}

		if (activeTournaments.has(tournamentId)) {
			await sql`UPDATE tournaments SET bracket_data = ${JSON.stringify(tourney.bracket)} WHERE id = ${tournamentId}`;
			emitToTournamentParticipants(tournamentId, 'tournament:bracket-update', { tournamentId, bracket: tourney.bracket });
		}
	}

	return {
		generateBracketJS,
		startTournamentRoundMatches,
		advanceTournamentWinner,
	};
}
