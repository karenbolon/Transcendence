// ── Types ────────────────────────────────────────────────────
export type QueueMode = 'quick' | 'wild' | 'custom';

export type QueueEntry = {
	userId: number;
	username: string;
	avatarUrl: string | null;
	displayName: string | null;
	socketId: string;
	mode: QueueMode;
	settings: { speedPreset: 'chill' | 'normal' | 'fast'; winScore: number };
	joinedAt: number;       // Date.now() when they joined
	flexibleAt: number;     // Date.now() + 30000 — when matching widens
};

export type MatchResult = {
	player1: QueueEntry;
	player2: QueueEntry;
	settings: { speedPreset: string; winScore: number };
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
	customSettings?: { speedPreset: 'chill' | 'normal' | 'fast'; winScore: number }
): { speedPreset: 'chill' | 'normal' | 'fast'; winScore: number } {
	switch (mode) {
		case 'quick':
			return { speedPreset: 'normal', winScore: 5 };
		case 'wild':
			// Placeholder — wild settings get resolved when the match happens
			// We store dummy values; they'll be overwritten at match time
			return { speedPreset: 'normal', winScore: 5 };
		case 'custom':
			return customSettings!;
	}
}

// Generate random settings for Wild mode (called when two wild players match)
function randomWildSettings(): { speedPreset: 'chill' | 'normal' | 'fast'; winScore: number } {
	const speeds: Array<'chill' | 'normal' | 'fast'> = ['chill', 'normal', 'fast'];
	const scores = [3, 5, 7, 11];
	return {
		speedPreset: speeds[Math.floor(Math.random() * speeds.length)],
		winScore: scores[Math.floor(Math.random() * scores.length)],
	};
}

// ── Matching Logic ───────────────────────────────────────────
// This is the heart of it. Given a new entry, can we find someone compatible?
//
// Matching tiers (tried in order):
// 1. Exact: same mode + same settings
// 2. Cross-compatible: quick(normal/5) matches custom(normal/5)
// 3. Flexible (after 30s): same speed any score, or quick matches any custom
// 4. Desperate (after 60s): anyone matches anyone
//
// Wild is special: two wild players always match each other, and they get
// random settings generated at match time.

function isCompatible(a: QueueEntry, b: QueueEntry): MatchResult | null {
	const now = Date.now();
	const aFlexible = now >= a.flexibleAt;
	const bFlexible = now >= b.flexibleAt;
	const aDesperate = now >= a.joinedAt + 60000;
	const bDesperate = now >= b.joinedAt + 60000;

	// ── Wild/Random: "I'll play anyone" — instant match ─────
	// Wild + Wild → random settings
	if (a.mode === 'wild' && b.mode === 'wild') {
		return { player1: a, player2: b, settings: randomWildSettings() };
	}
	// Wild + anything → use the other player's settings
	if (a.mode === 'wild') {
		return { player1: a, player2: b, settings: b.settings };
	}
	if (b.mode === 'wild') {
		return { player1: a, player2: b, settings: a.settings };
	}

	// ── Exact match: same settings ──────────────────────────
	// Quick + Quick → always match (both are normal/5)
	if (a.mode === 'quick' && b.mode === 'quick') {
		return { player1: a, player2: b, settings: { speedPreset: 'normal', winScore: 5 } };
	}

	// Quick + Custom(normal, 5) → match (same effective settings)
	if (a.mode === 'quick' && b.mode === 'custom' &&
		b.settings.speedPreset === 'normal' && b.settings.winScore === 5) {
		return { player1: a, player2: b, settings: a.settings };
	}
	if (b.mode === 'quick' && a.mode === 'custom' &&
		a.settings.speedPreset === 'normal' && a.settings.winScore === 5) {
		return { player1: a, player2: b, settings: b.settings };
	}

	// Custom + Custom → exact same settings
	if (a.mode === 'custom' && b.mode === 'custom' &&
		a.settings.speedPreset === b.settings.speedPreset &&
		a.settings.winScore === b.settings.winScore) {
		return { player1: a, player2: b, settings: a.settings };
	}

	// ── Flexible matching (after 30s) ────────────────────────
	if (aFlexible || bFlexible) {
		// Custom + Custom with same speed, different score
		if (a.mode === 'custom' && b.mode === 'custom' &&
			a.settings.speedPreset === b.settings.speedPreset) {
			// Use the longer-waiting player's settings
			const settings = a.joinedAt <= b.joinedAt ? a.settings : b.settings;
			return { player1: a, player2: b, settings };
		}

		// Quick matches any Custom player
		if ((a.mode === 'quick' && b.mode === 'custom') ||
			(a.mode === 'custom' && b.mode === 'quick')) {
			const customPlayer = a.mode === 'custom' ? a : b;
			return { player1: a, player2: b, settings: customPlayer.settings };
		}
	}

	// ── Desperate matching (after 60s) ───────────────────────
	if (aDesperate || bDesperate) {
		// Anyone matches anyone. Use longer-waiting player's settings.
		const settings = a.joinedAt <= b.joinedAt ? a.settings : b.settings;
		return { player1: a, player2: b, settings };
	}

	return null; // No match possible right now
}

// Scan the entire queue trying to find a match for the given entry
function findMatch(entry: QueueEntry): MatchResult | null {
	for (const [otherId, other] of queue) {
		if (otherId === entry.userId) continue; // Don't match with yourself
		const result = isCompatible(entry, other);
		if (result) return result;
	}
	return null;
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
	customSettings?: { speedPreset: 'chill' | 'normal' | 'fast'; winScore: number }
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
		flexibleAt: now + 30000, // becomes flexible after 30s
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
	const matched = new Set<number>(); // track who we already matched this scan

	const entries = Array.from(queue.values());

	for (let i = 0; i < entries.length; i++) {
		if (matched.has(entries[i].userId)) continue;

		for (let j = i + 1; j < entries.length; j++) {
			if (matched.has(entries[j].userId)) continue;

			const result = isCompatible(entries[i], entries[j]);
			if (result) {
				matches.push(result);
				matched.add(entries[i].userId);
				matched.add(entries[j].userId);
				queue.delete(entries[i].userId);
				queue.delete(entries[j].userId);
				break; // entry[i] is matched, move to next
			}
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
