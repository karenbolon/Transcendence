// ── Types ────────────────────────────────────────────────────
export type QueueMode = 'quick' | 'wild' | 'custom';

export type QueueEntry = {
	userId: number;
	username: string;
	avatarUrl: string | null;
	displayName: string | null;
	socketId: string;
	mode: QueueMode;
	settings: { speedPreset: 'chill' | 'normal' | 'fast'; winScore: number; powerUps: boolean };
	joinedAt: number;       // Date.now() when they joined
	flexibleAt: number;     // Date.now() + 30000 — when matching widens
};

export type MatchResult = {
	player1: QueueEntry;
	player2: QueueEntry;
	settings: { speedPreset: string; winScore: number; powerUps: boolean };
};

// ── Queue Storage ────────────────────────────────────────────
// One Map: userId → their queue entry. That's it.
// Why a Map keyed by userId? Because one player can only be in the queue once.
const queue = new Map<number, QueueEntry>();

// ── Settings Resolution ──────────────────────────────────────
// Each mode determines what settings the player plays with.
// Quick = always normal/5. Wild = random (resolved at MATCH time, not join time).
// Custom = whatever the player picked.
function resolveSettings(
	mode: QueueMode,
	customSettings?: { speedPreset: 'chill' | 'normal' | 'fast'; winScore: number; powerUps: boolean }
): { speedPreset: 'chill' | 'normal' | 'fast'; winScore: number; powerUps: boolean } {
	switch (mode) {
		case 'quick':
			return { speedPreset: 'normal', winScore: 5, powerUps: true };
		case 'wild':
			// Placeholder — wild settings get resolved when the match happens
			// We store dummy values; they'll be overwritten at match time
			return { speedPreset: 'normal', winScore: 5, powerUps: true };
		case 'custom':
			return {
				speedPreset: customSettings?.speedPreset || 'normal',
				winScore: customSettings?.winScore || 5,
				powerUps: customSettings?.powerUps ?? true,
			};
	}
}

// Generate random settings for Wild mode (called when two wild players match)
function randomWildSettings(): { speedPreset: 'chill' | 'normal' | 'fast'; winScore: number; powerUps: boolean } {
	const speeds: Array<'chill' | 'normal' | 'fast'> = ['chill', 'normal', 'fast'];
	const scores = [3, 5, 7, 11];
	return {
		speedPreset: speeds[Math.floor(Math.random() * speeds.length)],
		winScore: scores[Math.floor(Math.random() * scores.length)],
		powerUps: Math.random() > 0.3, // 70% chance of power-ups in wild
	};
}

// ── Matching Logic ───────────────────────────────────────────
// Score-based matchmaking: lower score = better compatibility.
// Each pair gets a compatibility score; the queue picks the BEST match,
// not just the first one. Tier thresholds limit the max allowed score.
//
// Tiers (based on the longer-waiting player):
//   0–45s  (exact):    score must be 0 (identical settings)
//   45–90s (flexible): score ≤ 4 (same speed, close score)
//   90s+   (wide):     any score (matches anyone)
//
// Wild is special: instant match with anyone.

const SPEED_ORDER: Record<string, number> = { chill: 0, normal: 1, fast: 2 };

/** How "far apart" are two entries' settings? Lower = closer. */
function compatibilityScore(a: QueueEntry, b: QueueEntry): number {
	const speedA = SPEED_ORDER[a.settings.speedPreset] ?? 1;
	const speedB = SPEED_ORDER[b.settings.speedPreset] ?? 1;
	const speedDiff = Math.abs(speedA - speedB); // 0, 1, or 2
	const scoreDiff = Math.abs(a.settings.winScore - b.settings.winScore); // 0–8
	const powerUpDiff = a.settings.powerUps !== b.settings.powerUps ? 2 : 0;
	// Speed matters more: adjacent speed = 2, opposite speed = 4
	return speedDiff * 2 + scoreDiff + powerUpDiff;
}

/** Max allowed score for this entry based on how long they've waited. */
function maxScoreForEntry(entry: QueueEntry, now: number): number {
	if (now >= entry.joinedAt + 90000) return Infinity; // wide: match anyone
	if (now >= entry.flexibleAt) return 4;              // flexible: close settings
	return 0;                                            // exact: identical only
}

/** Resolve which settings a matched pair plays with — closer to the longer-waiting player. */
function resolveMatchSettings(
	a: QueueEntry, b: QueueEntry
): { speedPreset: 'chill' | 'normal' | 'fast'; winScore: number; powerUps: boolean } {
	// Longer-waiting player's settings win
	return a.joinedAt <= b.joinedAt ? { ...a.settings } : { ...b.settings };
}

function tryMatch(a: QueueEntry, b: QueueEntry): MatchResult | null {
	const now = Date.now();

	// ── Wild/Random: instant match with anyone ──────────────
	if (a.mode === 'wild' && b.mode === 'wild') {
		return { player1: a, player2: b, settings: randomWildSettings() };
	}
	if (a.mode === 'wild') {
		return { player1: a, player2: b, settings: b.settings };
	}
	if (b.mode === 'wild') {
		return { player1: a, player2: b, settings: a.settings };
	}

	// ── Score-based matching ────────────────────────────────
	const score = compatibilityScore(a, b);
	// Both players must allow this score based on their wait time
	const maxA = maxScoreForEntry(a, now);
	const maxB = maxScoreForEntry(b, now);
	const allowed = Math.max(maxA, maxB); // if either is flexible enough, allow it

	if (score > allowed) return null;

	return { player1: a, player2: b, settings: resolveMatchSettings(a, b) };
}

/**
 * Find the BEST match for an entry — lowest compatibility score.
 * Returns the closest match, not just the first compatible one.
 */
function findMatch(entry: QueueEntry): MatchResult | null {
	let bestResult: MatchResult | null = null;
	let bestScore = Infinity;

	for (const [otherId, other] of queue) {
		if (otherId === entry.userId) continue;
		const result = tryMatch(entry, other);
		if (result) {
			const score = (entry.mode === 'wild' || other.mode === 'wild')
				? -1 // wild always wins as best match
				: compatibilityScore(entry, other);
			if (score < bestScore) {
				bestScore = score;
				bestResult = result;
			}
		}
	}
	return bestResult;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Add a player to the queue and immediately try to find a match.
 * Returns a MatchResult if matched instantly, or null if they're now waiting.
 */
export function addToQueue(
	userId: number,
	username: string,
	avatarUrl: string | null,
	displayName: string | null,
	socketId: string,
	mode: QueueMode,
	customSettings?: { speedPreset: 'chill' | 'normal' | 'fast'; winScore: number; powerUps: boolean }
): MatchResult | null {
	// Don't allow double-queue
	if (queue.has(userId)) return null;

	const now = Date.now();
	const entry: QueueEntry = {
		userId,
		username,
		avatarUrl,
		displayName,
		socketId,
		mode,
		settings: resolveSettings(mode, customSettings),
		joinedAt: now,
		flexibleAt: now + 45000, // becomes flexible after 45s
	};

	// Try to find a match BEFORE adding to queue
	// (so we don't have to immediately remove them)
	queue.set(userId, entry);
	const match = findMatch(entry);

	if (match) {
		// Remove both players from queue — they're going to play
		queue.delete(match.player1.userId);
		queue.delete(match.player2.userId);
		return match;
	}

	// No match found — player stays in queue, waiting
	return null;
}

/** Remove a player from the queue (they canceled or disconnected) */
export function removeFromQueue(userId: number): boolean {
	return queue.delete(userId);
}

/** Is this user currently in the queue? */
export function isInQueue(userId: number): boolean {
	return queue.has(userId);
}

/** Total players currently searching */
export function getQueueSize(): number {
	return queue.size;
}

/**
 * Get which of your friends are currently in the queue.
 * friendIds = your friend list (from the DB).
 * Returns only the ones that are in the queue right now.
 */
export function getFriendsInQueue(friendIds: number[]): QueueEntry[] {
	const result: QueueEntry[] = [];
	for (const fid of friendIds) {
		const entry = queue.get(fid);
		if (entry) result.push(entry);
	}
	return result;
}

/**
 * Get all queue entries (for displaying to other players).
 * Excludes the requesting user.
 */
export function getQueueEntries(excludeUserId?: number): QueueEntry[] {
	const result: QueueEntry[] = [];
	for (const [userId, entry] of queue) {
		if (userId !== excludeUserId) {
			result.push(entry);
		}
	}
	return result;
}

/** Get a player's position in the queue (1-based). Returns 0 if not in queue. */
export function getQueuePosition(userId: number): number {
	if (!queue.has(userId)) return 0;
	const entries = Array.from(queue.values())
		.sort((a, b) => a.joinedAt - b.joinedAt);
	const index = entries.findIndex(e => e.userId === userId);
	return index + 1;
}

/**
 * Periodic scan — called every 10 seconds by a setInterval.
 * Re-checks all queue entries to see if any have become flexible/desperate
 * enough to match with each other now.
 * Returns all matches found so the caller can create game rooms.
 */
export function scanForMatches(): MatchResult[] {
	const matches: MatchResult[] = [];
	const matched = new Set<number>();

	const entries = Array.from(queue.values());

	// For each unmatched entry, find their BEST available partner
	for (let i = 0; i < entries.length; i++) {
		if (matched.has(entries[i].userId)) continue;

		let bestResult: MatchResult | null = null;
		let bestScore = Infinity;

		for (let j = i + 1; j < entries.length; j++) {
			if (matched.has(entries[j].userId)) continue;

			const result = tryMatch(entries[i], entries[j]);
			if (result) {
				const score = (entries[i].mode === 'wild' || entries[j].mode === 'wild')
					? -1
					: compatibilityScore(entries[i], entries[j]);
				if (score < bestScore) {
					bestScore = score;
					bestResult = result;
				}
			}
		}

		if (bestResult) {
			matches.push(bestResult);
			matched.add(bestResult.player1.userId);
			matched.add(bestResult.player2.userId);
			queue.delete(bestResult.player1.userId);
			queue.delete(bestResult.player2.userId);
		}
	}

	return matches;
}

// ── Auto-expire: remove players after 5 minutes ─────────────
export function removeExpired(): number[] {
	const now = Date.now();
	const expired: number[] = [];
	for (const [userId, entry] of queue) {
		if (now - entry.joinedAt > 5 * 60 * 1000) {
			queue.delete(userId);
			expired.push(userId);
		}
	}
	return expired;
}
