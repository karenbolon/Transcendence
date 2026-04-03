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
const TOURNAMENT_PAUSE_TIMEOUT = 45_000; // 45 seconds for tournament pause
const PAUSE_EXTENSION_MS = 10_000;       // 10 seconds per extension
const MAX_PAUSE_EXTENSIONS = 3;          // max "Wait 10 more" clicks
const PAUSE_BUTTONS_DELAY = 15_000;      // show buttons after 15 seconds

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
	private spectatorSockets: Set<string> = new Set();
	private lastTickCount = 0;

	// ── Tournament pause state ───────────────────────────────
	private paused = false;
	private pauseTimer: ReturnType<typeof setTimeout> | null = null;
	private pauseRemaining = 0;
	private pausedAt = 0;
	private pauseExtensions = 0;
	private disconnectedUserId: number | null = null;
	// private pauseCountPerPlayer = new Map<number, number>(); // Uncomment to limit pauses per player (max 2)

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

		// If game was paused (tournament), resume it
		if (this.paused && userId === this.disconnectedUserId) {
			this.broadcastEvent(this.roomId, 'game:player-reconnected', { userId });
			this.resume();
		}

		return true;
	}

	/** Remove a socket (called on disconnect) */
	removeSocket(userId: number, socketId: string): void {
		const player = this.getPlayer(userId);
		if (!player) return;
		player.socketIds.delete(socketId);

		// If player has NO sockets left and game is active
		if (player.socketIds.size === 0 &&
			(this.state.phase === 'playing' || this.state.phase === 'countdown')) {

			// Tournament matches: pause the game instead of immediate forfeit
			if (this.roomId.startsWith('tournament-')) {
				this.broadcastEvent(this.roomId, 'game:player-disconnected', {
					userId, timeout: TOURNAMENT_PAUSE_TIMEOUT
				});
				this.pause(userId);
				return;
			}

			// Non-tournament: existing 15-second forfeit timer
			this.broadcastEvent(this.roomId, 'game:player-disconnected', {
				userId, timeout: RECONNECT_TIMEOUT
			});

			const timer = setTimeout(() => {
				this.disconnectTimers.delete(userId);
				const opponent = userId === this.player1.userId ? this.player2 : this.player1;
				this.handleForfeit(opponent);
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


	// ── Tournament Pause ─────────────────────────────────────

	/** Pause the game (tournament disconnect). Stops the tick loop and starts a forfeit timer. */
	pause(disconnectedUserId: number): void {
		if (this.paused || this.gameEnded || this.destroyed) return;
		if (!this.roomId.startsWith('tournament-')) return;

		// Uncomment to limit pauses per player:
		// const count = this.pauseCountPerPlayer.get(disconnectedUserId) ?? 0;
		// if (count >= 2) {
		// 	const opponent = disconnectedUserId === this.player1.userId ? this.player2 : this.player1;
		// 	this.handleForfeit(opponent);
		// 	return;
		// }
		// this.pauseCountPerPlayer.set(disconnectedUserId, count + 1);

		this.paused = true;
		this.pausedAt = Date.now();
		this.pauseRemaining = TOURNAMENT_PAUSE_TIMEOUT;
		this.pauseExtensions = 0;
		this.disconnectedUserId = disconnectedUserId;

		// Stop the game loop
		this.stop();

		// Notify remaining player
		this.broadcastEvent(this.roomId, 'game:paused', {
			disconnectedUserId,
			remaining: this.pauseRemaining,
			buttonsDelay: PAUSE_BUTTONS_DELAY,
		});

		// Start the forfeit timer
		this.pauseTimer = setTimeout(() => {
			this.pauseTimer = null;
			if (!this.paused || this.gameEnded) return;
			const opponent = disconnectedUserId === this.player1.userId ? this.player2 : this.player1;
			this.paused = false;
			this.handleForfeit(opponent);
		}, this.pauseRemaining);

		console.log(`[GameRoom] Tournament match ${this.roomId} PAUSED. Player ${disconnectedUserId} disconnected. Timeout: ${this.pauseRemaining / 1000}s`);
	}

	/** Resume the game after a tournament pause. Starts a countdown then resumes ticking. */
	resume(): void {
		if (!this.paused || this.gameEnded || this.destroyed) return;

		if (this.pauseTimer) {
			clearTimeout(this.pauseTimer);
			this.pauseTimer = null;
		}

		this.paused = false;
		this.disconnectedUserId = null;

		this.broadcastEvent(this.roomId, 'game:resumed', {});

		// Start countdown then resume playing
		startCountdown(this.state, this.settings);
		this.lastTick = Date.now();
		this.interval = setInterval(() => this.tick(), TICK_INTERVAL);

		console.log(`[GameRoom] Tournament match ${this.roomId} RESUMED with countdown.`);
	}

	/** Extend the pause by 10 seconds (opponent clicks "Wait 10 more"). */
	extendPause(): boolean {
		if (!this.paused || this.gameEnded) return false;
		if (this.pauseExtensions >= MAX_PAUSE_EXTENSIONS) return false;

		this.pauseExtensions++;

		if (this.pauseTimer) {
			clearTimeout(this.pauseTimer);
		}

		const elapsed = Date.now() - this.pausedAt;
		this.pauseRemaining = Math.max(0, this.pauseRemaining - elapsed) + PAUSE_EXTENSION_MS;
		this.pausedAt = Date.now();

		this.pauseTimer = setTimeout(() => {
			this.pauseTimer = null;
			if (!this.paused || this.gameEnded) return;
			const opponent = this.disconnectedUserId === this.player1.userId ? this.player2 : this.player1;
			this.paused = false;
			this.handleForfeit(opponent);
		}, this.pauseRemaining);

		this.broadcastEvent(this.roomId, 'game:pause-extended', {
			remaining: this.pauseRemaining,
			extensionsLeft: MAX_PAUSE_EXTENSIONS - this.pauseExtensions,
		});

		console.log(`[GameRoom] Pause extended in ${this.roomId}. Remaining: ${this.pauseRemaining / 1000}s, extensions left: ${MAX_PAUSE_EXTENSIONS - this.pauseExtensions}`);
		return true;
	}

	/** Opponent claims win during pause (immediate forfeit). */
	claimWin(claimingUserId: number): void {
		if (!this.paused || this.gameEnded) return;
		if (claimingUserId === this.disconnectedUserId) return;

		if (this.pauseTimer) {
			clearTimeout(this.pauseTimer);
			this.pauseTimer = null;
		}

		this.paused = false;
		const winner = this.getPlayer(claimingUserId);
		if (winner) {
			this.handleForfeit(winner);
		}
	}

	/** Check if the game is currently paused */
	get isPaused(): boolean {
		return this.paused;
	}

	/** Main game tick — runs 60 times per second on the server */
	private tick(): void {
		if (this.destroyed || this.paused) return;

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

		Promise.resolve(this.onGameEnd(result)).catch((err: any) => console.error('[GameRoom] onGameEnd error:', err));
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
			// Tournament matches MUST produce a winner so the bracket advances.
			if (this.roomId.startsWith('tournament-')) {
				// Set scores BEFORE endGame (it reads winner name, result reads scores)
				if (winner === this.player1) {
					this.state.score1 = 1;
					this.state.score2 = 0;
				} else {
					this.state.score1 = 0;
					this.state.score2 = 1;
				}
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
				Promise.resolve(this.onGameEnd(result)).catch((err: any) =>
					console.error('[GameRoom] onGameEnd error (tournament forfeit):', err));
				return;
			}

			// Non-tournament: cancel with no winner (existing behavior)
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
		Promise.resolve(this.onGameEnd(result)).catch((err: any) => console.error('[GameRoom] onGameEnd error (forfeit):', err));
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
		if (this.pauseTimer) {
			clearTimeout(this.pauseTimer);
			this.pauseTimer = null;
		}
		for (const timer of this.disconnectTimers.values()) {
			clearTimeout(timer);
		}
		this.disconnectTimers.clear();
		this.spectatorSockets.clear();
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

	addSpectator(socketId: string): void {
		this.spectatorSockets.add(socketId);
	}

	removeSpectator(socketId: string): void {
		this.spectatorSockets.delete(socketId);
	}

	get spectatorCount(): number {
		return this.spectatorSockets.size;
	}

	get spectators(): Set<string> {
		return this.spectatorSockets;
	}

	private getPlayer(userId: number): RoomPlayer | null {
		if (userId === this.player1.userId) return this.player1;
		if (userId === this.player2.userId) return this.player2;
		return null;
	}
}
