// @ts-nocheck
export function createMatchQueue() {
	const queue = new Map(); // userId -> QueueEntry
	const SPEED_ORDER = { chill: 0, normal: 1, fast: 2 };

	function resolveSettings(mode, customSettings) {
		if (mode === 'quick') return { speedPreset: 'normal', winScore: 5, powerUps: true };
		if (mode === 'wild') return { speedPreset: 'normal', winScore: 5, powerUps: true };
		return {
			speedPreset: customSettings?.speedPreset || 'normal',
			winScore: customSettings?.winScore || 5,
			powerUps: customSettings?.powerUps ?? true,
		};
	}

	function randomWildSettings() {
		const speeds = ['chill', 'normal', 'fast'];
		const scores = [3, 5, 7, 11];
		return {
			speedPreset: speeds[Math.floor(Math.random() * speeds.length)],
			winScore: scores[Math.floor(Math.random() * scores.length)],
			powerUps: Math.random() > 0.3,
		};
	}

	function compatibilityScore(a, b) {
		const speedA = SPEED_ORDER[a.settings.speedPreset] ?? 1;
		const speedB = SPEED_ORDER[b.settings.speedPreset] ?? 1;
		const speedDiff = Math.abs(speedA - speedB);
		const scoreDiff = Math.abs(a.settings.winScore - b.settings.winScore);
		const powerUpDiff = a.settings.powerUps !== b.settings.powerUps ? 2 : 0;
		return speedDiff * 2 + scoreDiff + powerUpDiff;
	}

	function maxScoreForEntry(entry, now) {
		if (now >= entry.joinedAt + 90000) return Infinity; // wide
		if (now >= entry.flexibleAt) return 4; // flexible
		return 0; // exact
	}

	function tryMatch(a, b) {
		const now = Date.now();
		if (a.mode === 'wild' && b.mode === 'wild') return { player1: a, player2: b, settings: randomWildSettings() };
		if (a.mode === 'wild') return { player1: a, player2: b, settings: b.settings };
		if (b.mode === 'wild') return { player1: a, player2: b, settings: a.settings };

		const score = compatibilityScore(a, b);
		const maxA = maxScoreForEntry(a, now);
		const maxB = maxScoreForEntry(b, now);
		const allowed = Math.max(maxA, maxB);
		if (score > allowed) return null;

		const settings = a.joinedAt <= b.joinedAt ? { ...a.settings } : { ...b.settings };
		return { player1: a, player2: b, settings };
	}

	function matchPriority(a, b) {
		if (a.mode === 'wild' || b.mode === 'wild') return -1;
		return compatibilityScore(a, b);
	}

	function add(userId, username, avatarUrl, displayName, socketId, mode, customSettings) {
		if (queue.has(userId)) return null;
		const now = Date.now();
		const entry = {
			userId,
			username,
			avatarUrl,
			displayName,
			socketId,
			mode,
			settings: resolveSettings(mode, customSettings),
			joinedAt: now,
			flexibleAt: now + 45000,
		};
		queue.set(userId, entry);

		let bestResult = null;
		let bestScore = Infinity;
		for (const [otherId, other] of queue) {
			if (otherId === userId) continue;
			const result = tryMatch(entry, other);
			if (result) {
				const score = matchPriority(entry, other);
				if (score < bestScore) {
					bestScore = score;
					bestResult = result;
				}
			}
		}
		if (bestResult) {
			queue.delete(bestResult.player1.userId);
			queue.delete(bestResult.player2.userId);
			return bestResult;
		}
		return null;
	}

	function remove(userId) {
		return queue.delete(userId);
	}

	function has(userId) {
		return queue.has(userId);
	}

	function size() {
		return queue.size;
	}

	function position(userId) {
		if (!queue.has(userId)) return 0;
		const entries = Array.from(queue.values()).sort((a, b) => a.joinedAt - b.joinedAt);
		return entries.findIndex((e) => e.userId === userId) + 1;
	}

	function entries(excludeUserId) {
		const result = [];
		for (const [uid, entry] of queue) {
			if (uid !== excludeUserId) result.push(entry);
		}
		return result;
	}

	function friendsInQueue(friendIds) {
		const result = [];
		for (const fid of friendIds) {
			const entry = queue.get(fid);
			if (entry) result.push(entry);
		}
		return result;
	}

	function scan() {
		const matches = [];
		const matched = new Set();
		const allEntries = Array.from(queue.values());

		for (let i = 0; i < allEntries.length; i++) {
			if (matched.has(allEntries[i].userId)) continue;
			let bestResult = null;
			let bestScore = Infinity;

			for (let j = i + 1; j < allEntries.length; j++) {
				if (matched.has(allEntries[j].userId)) continue;
				const result = tryMatch(allEntries[i], allEntries[j]);
				if (result) {
					const score = matchPriority(allEntries[i], allEntries[j]);
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

	function removeExpired() {
		const now = Date.now();
		const expired = [];
		for (const [userId, entry] of queue) {
			if (now - entry.joinedAt > 5 * 60 * 1000) {
				queue.delete(userId);
				expired.push(userId);
			}
		}
		return expired;
	}

	return {
		add,
		remove,
		has,
		size,
		position,
		entries,
		friendsInQueue,
		scan,
		removeExpired,
	};
}
