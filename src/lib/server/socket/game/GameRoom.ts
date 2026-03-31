import {
	type GameState,
	type GameSettings,
	type InputState,
	createGameState,
	update,
	startCountdown,
	startPlaying,
	endGame,
	SPEED_CONFIGS,
	type SpeedPreset,
} from '$lib/game/gameEngine';
import type { GameResult, GameStateSnapshot } from '$lib/types/game';
import { advanceWinner } from '../../tournament/TournamentManager';

export type { GameResult, GameStateSnapshot };

export interface RoomPlayer {
	userId: number;
	username: string;
	socketIds: Set<string>;   // One player can have multiple tabs open
	input: InputState;        // Their current paddle input
}

export interface GameRoomOptions {
	roomId: string;
	player1: { userId: number; username: string };
	player2: { userId: number; username: string };
	settings: { speedPreset: string; winScore: number; powerUps?: boolean };
	// Callbacks — the room doesn't know about Socket.IO directly,
	// it just calls these when it needs to send data
	onGameEnd: (result: GameResult) => void;
	broadcastState: (roomId: string, state: GameStateSnapshot) => void;
	broadcastEvent: (roomId: string, event: string, data: any) => void;
}

// ── Constants ─────────────────────────────────────────────────
const TICK_RATE = 60;
const TICK_INTERVAL = 1000 / TICK_RATE;  // ~16.67ms
const RECONNECT_TIMEOUT = 15_000;        // 15 seconds to reconnect

// ── GameRoom Class ────────────────────────────────────────────
export class GameRoom {
	readonly roomId: string;
	readonly player1: RoomPlayer;
	readonly player2: RoomPlayer;

	private state: GameState;
	private settings: GameSettings;
	private rawSettings: { speedPreset: string; winScore: number; powerUps?: boolean };
	private interval: ReturnType<typeof setInterval> | null = null;
	private lastTick: number = 0;
	private onGameEnd: GameRoomOptions['onGameEnd'];
	private broadcastState: GameRoomOptions['broadcastState'];
	private broadcastEvent: GameRoomOptions['broadcastEvent'];
	private disconnectTimers = new Map<number, ReturnType<typeof setTimeout>>();
	private destroyed = false;
	private gameEnded = false;
	private lastTickCount = 0;

	constructor(options: GameRoomOptions) {
		this.roomId = options.roomId;
		this.rawSettings = options.settings;
		this.onGameEnd = options.onGameEnd;
		this.broadcastState = options.broadcastState;
		this.broadcastEvent = options.broadcastEvent;

		// Convert speed preset string to actual ball speed values
		// Falls back to 'normal' if invalid preset
		const speedConfig = SPEED_CONFIGS[(options.settings.speedPreset as SpeedPreset)] ?? SPEED_CONFIGS.normal;

		this.settings = {
			winScore: options.settings.winScore,
			ballSpeed: speedConfig.ballSpeed,
			maxBallSpeed: speedConfig.maxBallSpeed,
			// We use 'local' mode because the engine's 'local' logic
			// just moves both paddles based on input — exactly what we want.
			// The server controls both paddles via socket input.
			gameMode: 'local',
			difficulty: 'medium',
			powerUps: options.settings.powerUps ?? true,
		};

		// Initialize both players with empty input
		const emptyInput: InputState = {
			paddle1Up: false, paddle1Down: false,
			paddle2Up: false, paddle2Down: false
		};

		this.player1 = {
			userId: options.player1.userId,
			username: options.player1.username,
			socketIds: new Set(),
			input: { ...emptyInput },
		};

		this.player2 = {
			userId: options.player2.userId,
			username: options.player2.username,
			socketIds: new Set(),
			input: { ...emptyInput },
		};

		// Create fresh game state (same function used client-side)
		this.state = createGameState();
		// ENSURE initialization of settings matches state
		this.state.powerUpsEnabled = !!this.settings.powerUps;
		
		console.log(`[GameRoom] Initialized room ${this.roomId} | Power-ups from settings: ${this.settings.powerUps} | State enabled: ${this.state.powerUpsEnabled} | Win score: ${this.settings.winScore}`);
		if (this.settings.powerUps) {
			console.log(`[GameRoom] Power-ups are ON. Initial cooldown: ${this.state.powerUpCooldown}s`);
		}
	}

	// ── Socket Management ─────────────────────────────────────
	/** Add a socket to a player (called when they join/reconnect) */
	addSocket(userId: number, socketId: string): boolean {
		const player = this.getPlayer(userId);
		if (!player) return false;
		player.socketIds.add(socketId);

		// If they were disconnected, cancel the forfeit timer
		const timer = this.disconnectTimers.get(userId);
		if (timer) {
			clearTimeout(timer);
			this.disconnectTimers.delete(userId);
			this.broadcastEvent(this.roomId, 'game:player-reconnected', { userId });
		}

		return true;
	}

	/** Remove a socket (called on disconnect) */
	removeSocket(userId: number, socketId: string): void {
		const player = this.getPlayer(userId);
		if (!player) return;
		player.socketIds.delete(socketId);

		// If player has NO sockets left and game is active → start forfeit timer
		if (player.socketIds.size === 0 &&
			(this.state.phase === 'playing' || this.state.phase === 'countdown')) {
			this.broadcastEvent(this.roomId, 'game:player-disconnected', {
				userId, timeout: RECONNECT_TIMEOUT
			});

			const timer = setTimeout(async () => {
				this.disconnectTimers.delete(userId);
				// Guard against double-forfeit: only process if game hasn't ended
				if (this.gameEnded) return;
				
				const opponent = userId === this.player1.userId ? this.player2 : this.player1;
				const isTournamentMatch = this.roomId.startsWith('tournament-');
				const bothZero = this.state.score1 === 0 && this.state.score2 === 0;

				// For tournament matches at 0-0, advance opponent immediately
				// (bypass handleForfeit which would just cancel the game)
				console.log(`[DEBUG removeSocket timer] isTournamentMatch=${isTournamentMatch} bothZero=${bothZero} roomId=${this.roomId}`);
				if (isTournamentMatch && bothZero) {
					try {
						const parts = this.roomId.split('-');
						const tournamentId = Number(parts[1]);
						const round = Number(parts[2].replace('r', ''));
						const matchIndex = Number(parts[3].replace('m', ''));
						console.log(`[DEBUG removeSocket] calling advanceWinner(tournamentId=${tournamentId}, round=${round}, matchIndex=${matchIndex}, winner=${opponent.userId}, loser=${userId})`);
						await advanceWinner(tournamentId, round, matchIndex, opponent.userId, userId, 1, 0);
						console.log(`[DEBUG removeSocket] advanceWinner completed, emitting game:cancelled`);
					} catch (err) {
						console.error('[Tournament] Disconnect advancement failed:', err);
					}
					// Clean up game room state (was missing — caused lingering rooms
					// and the remaining player never receiving a navigation event)
					this.gameEnded = true;
					this.stop();
					this.broadcastEvent(this.roomId, 'game:cancelled', {
						roomId: this.roomId,
						reason: 'Player disconnected at 0-0',
						leftUserId: userId,
						stayedUserId: opponent.userId,
						stayedUsername: opponent.username,
						settings: this.rawSettings,
					});
				} else {
					// For casual games, use standard forfeit logic
					this.handleForfeit(opponent);
				}
			}, RECONNECT_TIMEOUT);

			this.disconnectTimers.set(userId, timer);
		}
	}

	// ── Input Handling ────────────────────────────────────────
	/** Handle paddle input from a player */
	handleInput(userId: number, direction: 'up' | 'down' | 'stop'): void {
		const player = this.getPlayer(userId);
		if (!player) return;

		// Reset all input flags first
		player.input = {
			paddle1Up: false, paddle1Down: false,
			paddle2Up: false, paddle2Down: false
		};

		// Player 1 controls paddle1, Player 2 controls paddle2
		if (userId === this.player1.userId) {
			player.input.paddle1Up = direction === 'up';
			player.input.paddle1Down = direction === 'down';
		} else {
			player.input.paddle2Up = direction === 'up';
			player.input.paddle2Down = direction === 'down';
		}
	}

	// ── Game Lifecycle ────────────────────────────────────────
	/** Start the game (called when both players have joined the room) */
	start(): void {
		if (this.interval) return;  // Already started

		// Begin countdown using existing engine function
		startCountdown(this.state, this.settings);
		this.lastTick = Date.now();

		// Start the server game loop — this IS the authoritative tick
		this.interval = setInterval(() => this.tick(), TICK_INTERVAL);
	}

	/** Main game tick — runs 60 times per second on the server */
	private tick(): void {
		if (this.destroyed) return;

		// Calculate delta time since last tick
		const now = Date.now();
		const dt = (now - this.lastTick) / 1000;  // Convert to seconds
		this.lastTick = now;

		// Cap dt to prevent physics explosions if server hiccups
		const safeDt = Math.min(dt, 0.05);

		// Merge input from both players into one InputState
		const mergedInput: InputState = {
			paddle1Up: this.player1.input.paddle1Up,
			paddle1Down: this.player1.input.paddle1Down,
			paddle2Up: this.player2.input.paddle2Up,
			paddle2Down: this.player2.input.paddle2Down,
		};

		const prevPhase = this.state.phase;

		// Run the SAME physics update that runs client-side
		update(this.state, safeDt, mergedInput, this.settings);

		// Periodic diagnostic for power-ups (every 300 ticks ~5 seconds)
		this.lastTickCount++;
		if (this.settings.powerUps && this.lastTickCount % 300 === 0) {
			console.log(`[GameRoom] Tick ${this.lastTickCount} | Room ${this.roomId} | PowerUpItem: ${this.state.powerUpItem ? this.state.powerUpItem.type : 'null'} | Cooldown: ${this.state.powerUpCooldown.toFixed(1)}s`);
		}

		// Handle countdown → playing transition
		if (this.state.phase === 'countdown' && this.state.countdownTimer <= 0) {
			startPlaying(this.state, this.settings);
		}

		// Handle game over
		if (this.state.phase === 'gameover' && prevPhase === 'playing') {
			this.handleGameOver();
			return;
		}

		// Send current state to both players
		this.broadcastState(this.roomId, this.getSnapshot());
	}

	// ── State Snapshot ────────────────────────────────────────
	/** Build a GameStateSnapshot from the full GameState */
	private getSnapshot(): GameStateSnapshot {
		const snapshot: GameStateSnapshot = {
			phase: this.state.phase,
			paddle1Y: this.state.paddle1Y,
			paddle2Y: this.state.paddle2Y,
			ballX: this.state.ballX,
			ballY: this.state.ballY,
			ballVX: this.state.ballVX,
			ballVY: this.state.ballVY,
			ballSpin: this.state.ballSpin,
			ballRotation: this.state.ballRotation,
			score1: this.state.score1,
			score2: this.state.score2,
			countdownDisplay: this.state.countdownDisplay,
			winner: this.state.winner,
			scoreFlash: this.state.scoreFlash,
			scoreFlashTimer: this.state.scoreFlashTimer,
			timestamp: Date.now(),
			powerUpItem: this.state.powerUpItem ? {
				type: this.state.powerUpItem.type,
				x: this.state.powerUpItem.x,
				y: this.state.powerUpItem.y,
				radius: this.state.powerUpItem.radius,
			} : null,
			activeEffects: this.state.activeEffects.map(e => ({
				type: e.type,
				target: e.target,
				remainingTime: e.remainingTime,
				duration: e.duration,
			})),
			lastBallHitter: this.state.lastBallHitter,
		};

		if (snapshot.powerUpItem) {
			// One-time log when a power-up is in a snapshot to confirm it's being sent
			if (this.lastTickCount % 60 === 0) {
				console.log(`[GameRoom] Snapshot for room ${this.roomId} contains powerUpItem: ${snapshot.powerUpItem.type} at (${snapshot.powerUpItem.x.toFixed(0)}, ${snapshot.powerUpItem.y.toFixed(0)})`);
			}
		}

		return snapshot;
	}

	// ── Game End Handling ─────────────────────────────────────
	private handleGameOver(): void {
		if (this.gameEnded) return;
		this.gameEnded = true;
		this.stop();

		const p1Won = this.state.score1 > this.state.score2;
		const winner = p1Won ? this.player1 : this.player2;
		const loser = p1Won ? this.player2 : this.player1;

		const result: GameResult = {
			roomId: this.roomId,
			player1: { userId: this.player1.userId, username: this.player1.username, score: this.state.score1 },
			player2: { userId: this.player2.userId, username: this.player2.username, score: this.state.score2 },
			winnerId: winner.userId,
			winnerUsername: winner.username,
			loserId: loser.userId,
			loserUsername: loser.username,
			durationSeconds: Math.round(this.state.playTime),
			settings: this.rawSettings,
			ballReturns: this.state.ballReturns,
			maxDeficit: this.state.maxDeficit,
			reachedDeuce: this.state.reachedDeuce,
		};

		// Send final state + game over event
		this.broadcastState(this.roomId, this.getSnapshot());
		this.broadcastEvent(this.roomId, 'game:over', result);

		this.onGameEnd(result);
	}

	private handleForfeit(winner: RoomPlayer): void {
		if (this.gameEnded) return;
		this.gameEnded = true;
		this.stop();

		const loser = winner === this.player1 ? this.player2 : this.player1;
		const bothZero = this.state.score1 === 0 && this.state.score2 === 0;
		const gameNotStarted = this.state.phase === 'countdown' || this.state.phase === 'menu';

		// Fair forfeit rules:
		// - Game hasn't started yet → no winner, just cancel
		// - Score is 0-0 → no winner (could be connection issue)
		// - Score is 1+ → remaining player wins
		if (gameNotStarted || bothZero) {
			const reason = gameNotStarted
				? 'Player left before game started'
				: 'Player disconnected at 0-0';
			this.broadcastEvent(this.roomId, 'game:cancelled', {
				roomId: this.roomId,
				reason,
				leftUserId: loser.userId,
				stayedUserId: winner.userId,
				stayedUsername: winner.username,
				settings: this.rawSettings,
			});
			// No onGameEnd → no stats saved, no wins/losses recorded
			// RoomManager will clean up via destroyRoom in the disconnect handler
			return;
		}

		// Score is 1+ — the remaining player wins by forfeit
		endGame(this.state, winner.username);

		const result: GameResult = {
			roomId: this.roomId,
			player1: { userId: this.player1.userId, username: this.player1.username, score: this.state.score1 },
			player2: { userId: this.player2.userId, username: this.player2.username, score: this.state.score2 },
			winnerId: winner.userId,
			winnerUsername: winner.username,
			loserId: loser.userId,
			loserUsername: loser.username,
			durationSeconds: Math.round(this.state.playTime),
			settings: this.rawSettings,
			ballReturns: this.state.ballReturns,
			maxDeficit: this.state.maxDeficit,
			reachedDeuce: this.state.reachedDeuce,
		};

		this.broadcastEvent(this.roomId, 'game:forfeit', result);
		this.onGameEnd(result);
	}

	/** Immediate forfeit — player chose to leave (no reconnect timer) */
	forfeitByPlayer(userId: number): void {
		const player = this.getPlayer(userId);
		if (!player) return;
		const opponent = userId === this.player1.userId ? this.player2 : this.player1;
		this.handleForfeit(opponent);
	}

	// ── Cleanup ───────────────────────────────────────────────
	/** Stop the game loop */
	stop(): void {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
	}

	/** Full cleanup — stop loop + cancel all timers */
	destroy(): void {
		this.destroyed = true;
		this.stop();
		for (const timer of this.disconnectTimers.values()) {
			clearTimeout(timer);
		}
		this.disconnectTimers.clear();
	}

	// ── Helpers ───────────────────────────────────────────────

	hasPlayer(userId: number): boolean {
		return userId === this.player1.userId || userId === this.player2.userId;
	}

	get matchSettings(): { speedPreset: string; winScore: number } {
		return this.rawSettings;
	}

	getState(): GameStateSnapshot {
		return this.getSnapshot();
	}

	get hasGameEnded(): boolean {
		return this.gameEnded;
	}

	private getPlayer(userId: number): RoomPlayer | null {
		if (userId === this.player1.userId) return this.player1;
		if (userId === this.player2.userId) return this.player2;
		return null;
	}
}
