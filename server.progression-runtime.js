export function createProgressionRuntime({
	sql,
	emitToUser,
	advanceTournamentWinner,
	destroyGameRoom,
	logger = null,
}) {
	const XP_TABLE_SIZE = 100;
	const BASE_XP = 50;
	const GROWTH_FACTOR = 1.3;
	let xpThresholds = null;

	const ACHIEVEMENT_CONDITIONS = [
		{ id: 'shutout_bronze', field: 'shutout_wins', threshold: 1 },
		{ id: 'shutout_silver', field: 'shutout_wins', threshold: 10 },
		{ id: 'shutout_gold', field: 'shutout_wins', threshold: 50 },
		{ id: 'streak_bronze', field: 'best_win_streak', threshold: 3 },
		{ id: 'streak_silver', field: 'best_win_streak', threshold: 7 },
		{ id: 'streak_gold', field: 'best_win_streak', threshold: 15 },
		{ id: 'matches_10', field: 'games_played', threshold: 10 },
		{ id: 'matches_50', field: 'games_played', threshold: 50 },
		{ id: 'matches_v_100', field: 'games_played', threshold: 100 },
		{ id: 'matches_v_250', field: 'games_played', threshold: 250 },
		{ id: 'matches_v_500', field: 'games_played', threshold: 500 },
		{ id: 'points_bronze', field: 'total_points_scored', threshold: 50 },
		{ id: 'points_silver', field: 'total_points_scored', threshold: 250 },
		{ id: 'points_gold', field: 'total_points_scored', threshold: 1000 },
		{ id: 'comeback_bronze', field: 'comeback_wins', threshold: 1 },
		{ id: 'comeback_silver', field: 'comeback_wins', threshold: 5 },
		{ id: 'comeback_gold', field: 'comeback_wins', threshold: 20 },
		{ id: 'rally_bronze', field: 'total_ball_returns', threshold: 100 },
		{ id: 'rally_silver', field: 'total_ball_returns', threshold: 500 },
		{ id: 'rally_gold', field: 'total_ball_returns', threshold: 2000 },
	];

	function getXpThresholds() {
		if (xpThresholds) return xpThresholds;
		xpThresholds = [0];
		let cumulative = 0;
		for (let i = 1; i <= XP_TABLE_SIZE; i++) {
			cumulative += Math.round(BASE_XP * Math.pow(GROWTH_FACTOR, i - 1));
			xpThresholds.push(cumulative);
		}
		return xpThresholds;
	}

	function calculateMatchXp(result) {
		const bonuses = [];
		const base = result.won ? 50 : 20;
		if (result.won && result.player2Score === 0) bonuses.push({ name: 'Shutout', amount: 15 });
		if (result.won && result.currentWinStreak > 0) bonuses.push({ name: 'Win Streak', amount: Math.min(result.currentWinStreak * 5, 25) });
		if (result.won && result.maxDeficit >= 2) bonuses.push({ name: 'Comeback', amount: 10 });
		const speedBonusMap = { chill: 0, normal: 5, fast: 10 };
		const speedBonus = speedBonusMap[result.speedPreset] ?? 0;
		if (speedBonus > 0) bonuses.push({ name: 'Speed Bonus', amount: speedBonus });
		const total = base + bonuses.reduce((sum, b) => sum + b.amount, 0);
		return { base, bonuses, total };
	}

	function getLevelForXp(totalXp) {
		const thresholds = getXpThresholds();
		let level = 0;
		for (let i = 1; i < thresholds.length; i++) {
			if (totalXp >= thresholds[i]) level = i;
			else break;
		}
		const xpAtCurrentLevel = thresholds[level] ?? 0;
		const xpAtNextLevel = thresholds[level + 1] ?? thresholds[level] + 1000;
		return { level, xpIntoLevel: totalXp - xpAtCurrentLevel, xpForNextLevel: xpAtNextLevel - xpAtCurrentLevel };
	}

	function evaluateAchievements(stats, existingIds) {
		const newlyUnlocked = [];
		for (const cond of ACHIEVEMENT_CONDITIONS) {
			if (existingIds.has(cond.id)) continue;
			if (stats[cond.field] >= cond.threshold) newlyUnlocked.push(cond.id);
		}
		return newlyUnlocked;
	}

	async function processMatchProgressionSQL(userId, input) {
		const [existingRow] = await sql`SELECT * FROM player_progression WHERE user_id = ${userId}`;
		const isFirstGame = !existingRow;
		const current = existingRow ?? {
			current_level: 0, current_xp: 0, total_game_xp: 0, total_xp: 0,
			xp_to_next_level: 50, current_win_streak: 0, best_win_streak: 0,
			total_points_scored: 0, total_ball_returns: 0, shutout_wins: 0,
			comeback_wins: 0, consecutive_days_played: 0, last_played_at: null,
		};

		const newWinStreak = input.won ? current.current_win_streak + 1 : 0;
		const newBestStreak = Math.max(current.best_win_streak, newWinStreak);
		const newTotalPoints = current.total_points_scored + input.player1Score;
		const newBallReturns = current.total_ball_returns + input.ballReturns;
		const isShutout = input.won && input.player2Score === 0;
		const newShutoutWins = current.shutout_wins + (isShutout ? 1 : 0);
		const isComeback = input.won && input.maxDeficit >= 2;
		const newComebackWins = current.comeback_wins + (isComeback ? 1 : 0);

		const xpBreakdown = calculateMatchXp({
			won: input.won,
			player1Score: input.player1Score,
			player2Score: input.player2Score,
			winScore: input.winScore,
			speedPreset: input.speedPreset,
			currentWinStreak: newWinStreak,
			ballReturns: input.ballReturns,
			maxDeficit: input.maxDeficit,
		});
		const oldTotalXp = current.total_xp;
		const newTotalXp = oldTotalXp + xpBreakdown.total;
		const oldLevelInfo = getLevelForXp(oldTotalXp);
		const newLevelInfo = getLevelForXp(newTotalXp);

		const now = new Date();
		let newConsecutiveDays = current.consecutive_days_played;
		if (current.last_played_at) {
			const diffHours = (now.getTime() - new Date(current.last_played_at).getTime()) / (1000 * 60 * 60);
			if (diffHours >= 20 && diffHours <= 48) newConsecutiveDays++;
			else if (diffHours > 48) newConsecutiveDays = 1;
		} else {
			newConsecutiveDays = 1;
		}

		if (isFirstGame) {
			await sql`
				INSERT INTO player_progression (user_id, current_level, current_xp, total_game_xp, total_xp,
					xp_to_next_level, current_win_streak, best_win_streak, total_points_scored,
					total_ball_returns, shutout_wins, comeback_wins, consecutive_days_played, last_played_at)
				VALUES (${userId}, ${newLevelInfo.level}, ${newLevelInfo.xpIntoLevel},
					${current.total_game_xp + xpBreakdown.total}, ${newTotalXp}, ${newLevelInfo.xpForNextLevel},
					${newWinStreak}, ${newBestStreak}, ${newTotalPoints}, ${newBallReturns},
					${newShutoutWins}, ${newComebackWins}, ${newConsecutiveDays}, ${now})
			`;
		} else {
			await sql`
				UPDATE player_progression SET
					current_level = ${newLevelInfo.level}, current_xp = ${newLevelInfo.xpIntoLevel},
					total_game_xp = total_game_xp + ${xpBreakdown.total}, total_xp = ${newTotalXp},
					xp_to_next_level = ${newLevelInfo.xpForNextLevel},
					current_win_streak = ${newWinStreak}, best_win_streak = ${newBestStreak},
					total_points_scored = ${newTotalPoints}, total_ball_returns = ${newBallReturns},
					shutout_wins = ${newShutoutWins}, comeback_wins = ${newComebackWins},
					consecutive_days_played = ${newConsecutiveDays}, last_played_at = ${now}
				WHERE user_id = ${userId}
			`;
		}

		const [userRow] = await sql`SELECT games_played FROM users WHERE id = ${userId}`;
		const existingAchievements = await sql`SELECT achievement_id FROM achievements WHERE user_id = ${userId}`;
		const existingIds = new Set(existingAchievements.map((a) => a.achievement_id));
		const stats = {
			shutout_wins: newShutoutWins,
			best_win_streak: newBestStreak,
			total_points_scored: newTotalPoints,
			comeback_wins: newComebackWins,
			total_ball_returns: newBallReturns,
			games_played: userRow?.games_played ?? 0,
		};
		const newAchievementIds = evaluateAchievements(stats, existingIds);

		if (newAchievementIds.length > 0) {
			for (const achId of newAchievementIds) {
				await sql`INSERT INTO achievements (user_id, achievement_id) VALUES (${userId}, ${achId})`;
			}
		}

		let newAchievementDetails = [];
		if (newAchievementIds.length > 0) {
			newAchievementDetails = await sql`
				SELECT id, name, description, tier FROM achievement_definitions WHERE id = ANY(${newAchievementIds})
			`;
		}

		return {
			xpEarned: xpBreakdown.total,
			bonuses: [{ name: 'Base', amount: xpBreakdown.base }, ...xpBreakdown.bonuses],
			oldLevel: oldLevelInfo.level,
			newLevel: newLevelInfo.level,
			currentXp: newLevelInfo.xpIntoLevel,
			xpForNextLevel: newLevelInfo.xpForNextLevel,
			newAchievements: newAchievementDetails.map((d) => ({ id: d.id, name: d.name, description: d.description, tier: d.tier })),
		};
	}

	function parseTournamentContext(roomId) {
		if (!roomId.startsWith('tournament-')) {
			return { isTournament: false, tournamentId: null, tournamentRound: null, tournamentMatchIndex: null };
		}
		const parts = roomId.split('-');
		return {
			isTournament: true,
			tournamentId: Number(parts[1]),
			tournamentRound: Number(parts[2].replace('r', '')),
			tournamentMatchIndex: Number(parts[3].replace('m', '')),
		};
	}

	async function incrementUserMatchStats(tx, userId, won, finishedAt) {
		await tx`
			UPDATE users SET
				games_played = games_played + 1,
				wins = wins + ${won ? 1 : 0},
				losses = losses + ${won ? 0 : 1},
				updated_at = ${finishedAt}
			WHERE id = ${userId}
		`;
	}

	function buildProgressionInput(result, { won, selfScore, opponentScore, maxDeficit }) {
		return {
			won,
			player1Score: selfScore,
			player2Score: opponentScore,
			winScore: result.settings.winScore,
			speedPreset: result.settings.speedPreset,
			ballReturns: result.ballReturns,
			maxDeficit,
			reachedDeuce: result.reachedDeuce,
		};
	}

	async function saveOnlineMatch(result) {
		try {
			const finishedAt = new Date();
			const startedAt = new Date(finishedAt.getTime() - result.durationSeconds * 1000);
			const p1Won = result.winnerId === result.player1.userId;
			const p2Won = result.winnerId === result.player2.userId;
			const { isTournament, tournamentId, tournamentRound, tournamentMatchIndex } = parseTournamentContext(result.roomId);

			let gameRecordId = null;
			await sql.begin(async (tx) => {
				const [gameRecord] = await tx`
					INSERT INTO games (type, status, game_mode, player1_id, player2_id, player2_name,
						player1_score, player2_score, winner_id, winner_name, winner_score,
						speed_preset, duration_seconds, started_at, finished_at,
						tournament_id, tournament_round, tournament_match_index)
					VALUES ('pong', 'finished', 'online',
						${result.player1.userId}, ${result.player2.userId}, ${result.player2.username},
						${result.player1.score}, ${result.player2.score},
						${result.winnerId}, ${result.winnerUsername}, ${result.settings.winScore},
						${result.settings.speedPreset}, ${result.durationSeconds},
						${startedAt}, ${finishedAt},
						${tournamentId}, ${tournamentRound}, ${tournamentMatchIndex})
					RETURNING id
				`;
				gameRecordId = gameRecord.id;

				await Promise.all([
					incrementUserMatchStats(tx, result.player1.userId, p1Won, finishedAt),
					incrementUserMatchStats(tx, result.player2.userId, p2Won, finishedAt),
				]);
			});

			const p1MaxDeficit = result.maxDeficit;
			const p2MaxDeficit = Math.max(0, result.player1.score - result.player2.score);
			const [p1Progression, p2Progression] = await Promise.all([
				processMatchProgressionSQL(
					result.player1.userId,
					buildProgressionInput(result, {
						won: p1Won,
						selfScore: result.player1.score,
						opponentScore: result.player2.score,
						maxDeficit: p1MaxDeficit,
					}),
				),
				processMatchProgressionSQL(
					result.player2.userId,
					buildProgressionInput(result, {
						won: p2Won,
						selfScore: result.player2.score,
						opponentScore: result.player1.score,
						maxDeficit: p2MaxDeficit,
					}),
				),
			]);

			emitToUser(result.player1.userId, 'game:progression', p1Progression);
			emitToUser(result.player2.userId, 'game:progression', p2Progression);

			if (isTournament && tournamentId != null) {
				for (const [uid, progression] of [[result.player1.userId, p1Progression], [result.player2.userId, p2Progression]]) {
					if (progression.xpEarned > 0) {
						await sql`
							UPDATE tournament_participants
							SET xp_earned = xp_earned + ${progression.xpEarned}
							WHERE tournament_id = ${tournamentId} AND user_id = ${uid}
						`;
					}
				}
			}

			if (isTournament && tournamentId != null && tournamentRound != null && tournamentMatchIndex != null) {
				const tWinnerScore = result.winnerId === result.player1.userId ? result.player1.score : result.player2.score;
				const tLoserScore = result.winnerId === result.player1.userId ? result.player2.score : result.player1.score;
				await advanceTournamentWinner(tournamentId, tournamentRound, tournamentMatchIndex, result.winnerId, result.loserId, tWinnerScore, tLoserScore);
			}

			await sql`
				INSERT INTO messages (sender_id, recipient_id, game_id, type, content)
				VALUES (${result.player1.userId}, ${result.player2.userId}, ${gameRecordId}, 'system',
					${'🏆 ' + result.winnerUsername + ' won ' + result.player1.score + '-' + result.player2.score})
			`;

			if (logger) {
				logger.info({
					roomId: result.roomId,
					winnerId: result.winnerId,
					winnerUsername: result.winnerUsername,
				}, 'Online match saved');
			}
		} catch (err) {
			if (logger) {
				logger.error({ err, roomId: result.roomId }, 'Failed to save online match');
			}
		} finally {
			destroyGameRoom(result.roomId);
		}
	}

	return {
		saveOnlineMatch,
	};
}
