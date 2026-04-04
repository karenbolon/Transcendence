import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getActiveTournamentMock } = vi.hoisted(() => ({
	getActiveTournamentMock: vi.fn(),
}));

vi.mock('../../tournament/TournamentManager', () => ({
	getActiveTournament: getActiveTournamentMock,
}));

import { GameRoom } from './GameRoom';
import type { GameResult } from '$lib/types/game';

describe('GameRoom tournament disconnects', () => {
	beforeEach(() => {
		getActiveTournamentMock.mockReset();
	});

	it('finishes a 2-player tournament final if a player disconnects before countdown starts', () => {
		getActiveTournamentMock.mockReturnValue({
			id: 42,
			bracket: [{ round: 1, matches: [] }],
		});

		const onGameEnd = vi.fn<(result: GameResult) => void>();
		const broadcastState = vi.fn();
		const broadcastEvent = vi.fn();

		const room = new GameRoom({
			roomId: 'tournament-42-r1-m0',
			player1: { userId: 1, username: 'alice' },
			player2: { userId: 2, username: 'bob' },
			settings: { speedPreset: 'normal', winScore: 5 },
			onGameEnd,
			broadcastState,
			broadcastEvent,
		});

		room.addSocket(1, 'socket-a');
		room.removeSocket(1, 'socket-a');

		expect(onGameEnd).toHaveBeenCalledTimes(1);
		expect(onGameEnd).toHaveBeenCalledWith(
			expect.objectContaining({
				roomId: 'tournament-42-r1-m0',
				winnerId: 2,
				loserId: 1,
			}),
		);
		expect(broadcastEvent).toHaveBeenCalledWith(
			'tournament-42-r1-m0',
			'game:forfeit',
			expect.objectContaining({
				winnerId: 2,
				loserId: 1,
			}),
		);
		expect(room.hasGameEnded).toBe(true);
		expect(room.isPaused).toBe(false);
	});
});
