// ── Types ──────────────────────────────────────────────
export interface BracketMatch {
	matchIndex: number;
	player1Id: number | null;  // null = TBD (winner of previous round)
	player2Id: number | null;
	player1Username: string | null;
	player2Username: string | null;
	winnerId: number | null;
	status: 'pending' | 'playing' | 'finished' | 'bye';
}

export interface BracketRound {
	round: number;  // 1-based
	matches: BracketMatch[];
}

export type BracketPlayer = { id: number; username: string };

// ── Bracket Generator ──────────────────────────────────
/**
 * Generate a single-elimination bracket.
 * Supports any number of players (2–16).
 * If not a power of 2, top seeds get byes.
 */
export function generateBracket(players: BracketPlayer[]): BracketRound[] {
	const size = nextPowerOf2(players.length);
	const totalRounds = Math.log2(size);
	const rounds: BracketRound[] = [];

	// Pad with null for byes
	const seeded: (BracketPlayer | null)[] = [...players];
	while (seeded.length < size) seeded.push(null);

	// Classic bracket seeding: 1v8, 4v5, 2v7, 3v6
	const paired = seedPairing(seeded);

	// Round 1
	const round1: BracketMatch[] = [];
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

	// Subsequent rounds (empty until filled by match results)
	let matchesInRound = round1.length / 2;
	for (let r = 2; r <= totalRounds; r++) {
		const roundMatches: BracketMatch[] = [];
		for (let i = 0; i < matchesInRound; i++) {
			roundMatches.push({
				matchIndex: i,
				player1Id: null,
				player2Id: null,
				player1Username: null,
				player2Username: null,
				winnerId: null,
				status: 'pending',
			});
		}
		rounds.push({ round: r, matches: roundMatches });
		matchesInRound /= 2;
	}

	// Auto-advance bye winners into round 2
	const round2 = rounds.find(r => r.round === 2);
	if (round2) {
		for (const match of round1) {
			if (match.status === 'bye' && match.winnerId) {
				const nextMatchIndex = Math.floor(match.matchIndex / 2);
				const nextMatch = round2.matches[nextMatchIndex];
				if (nextMatch) {
					const winner = players.find(p => p.id === match.winnerId);
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

function nextPowerOf2(n: number): number {
	let p = 1;
	while (p < n) p *= 2;
	return p;
}

function seedPairing<T>(players: T[]): T[] {
	const n = players.length;
	if (n <= 2) return players;
	const result: T[] = new Array(n);
	for (let i = 0; i < n / 2; i++) {
		result[i * 2] = players[i];
		result[i * 2 + 1] = players[n - 1 - i];
	}
	return result;
}