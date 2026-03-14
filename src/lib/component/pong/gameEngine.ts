export type GamePhase = 'menu' | 'countdown' | 'playing' | 'paused' | 'gameover';

export interface GameState {
	// Current phase
	phase: GamePhase;

	// Paddles — Y position of the TOP edge
	paddle1Y: number;
	paddle2Y: number;

	// Ball — center position + velocity
	ballX: number;
	ballY: number;
	ballVX: number;
	ballVY: number;
	currentBallSpeed: number;

	// Ball spin — continuous curve applied to ballVY each frame
	ballSpin: number;
	// Ball rotation angle — visual only, accumulated from spin
	ballRotation: number;

	// Paddle velocities — tracked to impart spin on contact
	paddle1VY: number;
	paddle2VY: number;

	// Scores
	score1: number;
	score2: number;

	// Winner (set when game ends)
	winner: string;

	// Match duration — total seconds spent in 'playing' phase
	playTime: number;

	// Countdown
	countdownTimer: number;
	countdownDisplay: string;

	// Scoring effects
	scorePause: number;
	scoreFlash: 'left' | 'right' | null;
	scoreFlashTimer: number;

	// Progression tracking
	ballReturns: number;     // total paddle hits this match
	maxDeficit: number;      // biggest point deficit player 1 faced
	reachedDeuce: boolean;   // true if scores tied at >= (winScore - 1)
	maxBallSpeedReached: number;
	longestRally: number;
}

export interface InputState {
	paddle1Up: boolean;
	paddle1Down: boolean;
	paddle2Up: boolean;
	paddle2Down: boolean;
}

export interface GameSettings {
	winScore: number;
	ballSpeed: number;
	maxBallSpeed: number;
	gameMode: GameMode;
	difficulty: Difficulty;
}

export interface GameModifiers {
	paddle1Height: number;
	paddle2Height: number;
	ballSpeedMultiplier: number;
	paddle1SpeedMultiplier: number;
	paddle2SpeedMultiplier: number;
}

export type GameMode = 'local' | 'computer' | 'online';

export type SpeedPreset = 'chill' | 'normal' | 'fast';

export const SPEED_CONFIGS: Record<SpeedPreset, { ballSpeed: number; maxBallSpeed: number }> = {
	chill: { ballSpeed: 200, maxBallSpeed: 400 },
	normal: { ballSpeed: 500, maxBallSpeed: 700 },
	fast: { ballSpeed: 700, maxBallSpeed: 1100 },
};

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_CONFIGS: Record<Difficulty, { speedMultiplier: number; deadZone: number }> = {
	easy:   { speedMultiplier: 0.6, deadZone: 40 },
	medium: { speedMultiplier: 1.0, deadZone: 20 },
	hard:   { speedMultiplier: 1.3, deadZone: 8 },
};

export const CANVAS_WIDTH = 900;
export const CANVAS_HEIGHT = 560;
export const PADDLE_WIDTH = 10;
export const PADDLE_HEIGHT = 80;
export const PADDLE_OFFSET = 30;
export const PADDLE_SPEED = 500;
export const BALL_RADIUS = 8;
export const BALL_SPEED_INCREMENT = 20;
export const MAX_BOUNCE_ANGLE = 0.75;
export const SCORE_PAUSE_DURATION = 0.8;
export const SPIN_FACTOR = 0.6;       // How much paddle velocity transfers to spin
export const SPIN_ACCELERATION = 800;  // How strongly spin curves the ball (px/s²)
export const SPIN_DECAY = 0.97;        // Spin fades slightly each frame (friction)

export const DEFAULT_MODIFIERS: GameModifiers = {
	paddle1Height: PADDLE_HEIGHT,
	paddle2Height: PADDLE_HEIGHT,
	ballSpeedMultiplier: 1,
	paddle1SpeedMultiplier: 1,
	paddle2SpeedMultiplier: 1,
};

export function createGameState(): GameState {
	return {
		phase: 'menu',
		paddle1Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
		paddle2Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
		ballX: CANVAS_WIDTH / 2,
		ballY: CANVAS_HEIGHT / 2,
		ballVX: 0,
		ballVY: 0,
		currentBallSpeed: 0,
		ballSpin: 0,
		ballRotation: 0,
		paddle1VY: 0,
		paddle2VY: 0,
		score1: 0,
		score2: 0,
		winner: '',
		playTime: 0,
		countdownTimer: 0,
		countdownDisplay: '',
		scorePause: 0,
		scoreFlash: null,
		scoreFlashTimer: 0,
		ballReturns: 0,
		maxDeficit: 0,
		reachedDeuce: false,
		maxBallSpeedReached: 0,
		longestRally: 0,
	};
}

/** MENU → COUNTDOWN */
export function startCountdown(state: GameState, settings: GameSettings): void {
	state.phase = 'countdown';
	state.countdownTimer = 3.5;
	state.countdownDisplay = '3';
	state.currentBallSpeed = settings.ballSpeed;
	state.playTime = 0;
	resetPositions(state);
}

/** COUNTDOWN → PLAYING */
export function startPlaying(state: GameState, settings: GameSettings): void {
	state.phase = 'playing';
	const direction = Math.random() > 0.5 ? 1 : -1;
	state.ballVX = settings.ballSpeed * direction;
	state.ballVY = settings.ballSpeed * (Math.random() - 0.5);
}

/** PLAYING → GAMEOVER */
export function endGame(state: GameState, winnerName: string): void {
	state.phase = 'gameover';
	state.winner = winnerName;
	state.ballVX = 0;
	state.ballVY = 0;
}

/** PLAYING → PAUSED */
export function pauseGame(state: GameState): void {
	state.phase = 'paused';
}

/** PAUSED → PLAYING */
export function resumeGame(state: GameState): void {
	state.phase = 'playing';
}

/** GAMEOVER → MENU */
export function returnToMenu(state: GameState): void {
	state.phase = 'menu';
	state.score1 = 0;
	state.score2 = 0;
	state.winner = '';
	state.playTime = 0;
	state.scoreFlash = null;
	state.scoreFlashTimer = 0;
	state.scorePause = 0;
	state.ballReturns = 0;
	state.maxDeficit = 0;
	state.reachedDeuce = false;
	state.maxBallSpeedReached = 0;
	state.longestRally = 0;
	resetPositions(state);
}

/** Helper: Reset positions to center */
function resetPositions(state: GameState): void {
	state.paddle1Y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
	state.paddle2Y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
	state.ballX = CANVAS_WIDTH / 2;
	state.ballY = CANVAS_HEIGHT / 2;
	state.ballVX = 0;
	state.ballVY = 0;
	state.ballSpin = 0;
	state.ballRotation = 0;
	state.paddle1VY = 0;
	state.paddle2VY = 0;
}

/** Reset ball to center (between points, not full reset) */
function resetBall(state: GameState, settings: GameSettings): void {
	state.ballX = CANVAS_WIDTH / 2;
	state.ballY = CANVAS_HEIGHT / 2;
	state.currentBallSpeed = settings.ballSpeed;
	state.ballSpin = 0;
	const direction = Math.random() > 0.5 ? 1 : -1;
	state.ballVX = settings.ballSpeed * direction;
	state.ballVY = settings.ballSpeed * (Math.random() - 0.5);
}

export function update(
	state: GameState,
	dt: number,
	input: InputState,
	settings: GameSettings,
	modifiers: GameModifiers = DEFAULT_MODIFIERS
): void {
	// Score flash fades regardless of phase
	if (state.scoreFlashTimer > 0) {
		state.scoreFlashTimer -= dt;
		if (state.scoreFlashTimer <= 0) {
			state.scoreFlash = null;
		}
	}

	// Dispatch to phase-specific update
	switch (state.phase) {
		case 'countdown':
			updateCountdown(state, dt, input, settings);
			break;
		case 'playing':
			updatePlaying(state, dt, input, settings, modifiers);
			break;
		// case 'paused':
		// 	updatePaused(state, dt, input, settings);
		// 	break;
		// 'menu' and 'gameover': nothing to update
	}
}

function updateCountdown(state: GameState, dt: number, input: InputState, settings: GameSettings): void {
	state.countdownTimer -= dt;

	if (state.countdownTimer > 3) state.countdownDisplay = '3';
	else if (state.countdownTimer > 2) state.countdownDisplay = '2';
	else if (state.countdownTimer > 1) state.countdownDisplay = '1';
	else if (state.countdownTimer > 0) state.countdownDisplay = 'GO!';
	else {
		// Timer finished — will be caught by the component to call startPlaying()
		state.countdownDisplay = 'GO!';
		state.countdownTimer = 0;
		return;
	}

	// Paddles can move during countdown (no modifiers active yet)
	movePaddles(state, dt, input, settings, DEFAULT_MODIFIERS);
}

function updatePlaying(
	state: GameState,
	dt: number,
	input: InputState,
	settings: GameSettings,
	modifiers: GameModifiers
): void {
	// Track total play time
	state.playTime += dt;

	// Score pause
	if (state.scorePause > 0) {
		state.scorePause -= dt;
		return;
	}

	// Move paddles
	movePaddles(state, dt, input, settings, modifiers);

	// Apply spin: curves the ball trajectory over time
	state.ballVY += state.ballSpin * SPIN_ACCELERATION * dt;
	state.ballSpin *= SPIN_DECAY;

	// Dampen tiny spin values to zero
	if (Math.abs(state.ballSpin) < 0.001) state.ballSpin = 0;

	// Update visual rotation
	state.ballRotation += state.ballSpin * 15 * dt;

	// Move ball (apply speed boost if active)
	const speedMul = modifiers.ballSpeedMultiplier;
	state.ballX += state.ballVX * dt * speedMul;
	state.ballY += state.ballVY * dt * speedMul;

	// Wall bounce (top/bottom)
	if (state.ballY - BALL_RADIUS <= 0) {
		state.ballY = BALL_RADIUS;
		state.ballVY = Math.abs(state.ballVY);
	}
	if (state.ballY + BALL_RADIUS >= CANVAS_HEIGHT) {
		state.ballY = CANVAS_HEIGHT - BALL_RADIUS;
		state.ballVY = -Math.abs(state.ballVY);
	}

	// Paddle collisions
	checkPaddleCollision(state, settings, modifiers);

	// Scoring
	checkScoring(state, settings);
}

function movePaddles(state: GameState, dt: number, input: InputState, settings: GameSettings, modifiers: GameModifiers): void {
	const prevP1Y = state.paddle1Y;
	const prevP2Y = state.paddle2Y;

	const p1Speed = PADDLE_SPEED * modifiers.paddle1SpeedMultiplier;
	if (input.paddle1Up) state.paddle1Y -= p1Speed * dt;
	if (input.paddle1Down) state.paddle1Y += p1Speed * dt;

	// Apply difficulty speed multiplier to AI paddle, then power-up modifier
	const p2BaseSpeed = settings.gameMode === 'computer'
		? PADDLE_SPEED * DIFFICULTY_CONFIGS[settings.difficulty].speedMultiplier
		: PADDLE_SPEED;
	const p2Speed = p2BaseSpeed * modifiers.paddle2SpeedMultiplier;
	if (input.paddle2Up) state.paddle2Y -= p2Speed * dt;
	if (input.paddle2Down) state.paddle2Y += p2Speed * dt;

	// Clamp to canvas bounds
	state.paddle1Y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, state.paddle1Y));
	state.paddle2Y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, state.paddle2Y));
	// Track paddle velocities for spin calculation
	state.paddle1VY = dt > 0 ? (state.paddle1Y - prevP1Y) / dt : 0;
	state.paddle2VY = dt > 0 ? (state.paddle2Y - prevP2Y) / dt : 0;
}

function checkPaddleCollision(state: GameState, settings: GameSettings, modifiers: GameModifiers): void {
	const p1Height = modifiers.paddle1Height;
	const p2Height = modifiers.paddle2Height;

	// Left paddle
	if (
		state.ballVX < 0 &&
		state.ballX - BALL_RADIUS <= PADDLE_OFFSET + PADDLE_WIDTH &&
		state.ballX + BALL_RADIUS >= PADDLE_OFFSET &&
		state.ballY + BALL_RADIUS >= state.paddle1Y &&
		state.ballY - BALL_RADIUS <= state.paddle1Y + p1Height
	) {
		handlePaddleBounce(state, state.paddle1Y, 1, settings, state.paddle1VY, p1Height);
	}

	// Right paddle
	const p2Left = CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
	if (
		state.ballVX > 0 &&
		state.ballX + BALL_RADIUS >= p2Left &&
		state.ballX - BALL_RADIUS <= CANVAS_WIDTH - PADDLE_OFFSET &&
		state.ballY + BALL_RADIUS >= state.paddle2Y &&
		state.ballY - BALL_RADIUS <= state.paddle2Y + p2Height
	) {
		handlePaddleBounce(state, state.paddle2Y, -1, settings, state.paddle2VY, p2Height);
	}
}

function handlePaddleBounce(
	state: GameState,
	paddleY: number,
	direction: number,
	settings: GameSettings,
	paddleVY: number,
	paddleHeight: number = PADDLE_HEIGHT
): void {
	const paddleCenter = paddleY + paddleHeight / 2;
	const offset = (state.ballY - paddleCenter) / (paddleHeight / 2);
	const clampedOffset = Math.max(-1, Math.min(1, offset));

	// Speed up (capped at max)
	state.currentBallSpeed = Math.min(
		state.currentBallSpeed + BALL_SPEED_INCREMENT,
		settings.maxBallSpeed
	);

	// Calculate new velocity
	const bounceAngle = clampedOffset * MAX_BOUNCE_ANGLE;
	state.ballVY = state.currentBallSpeed * bounceAngle;
	state.ballVX = state.currentBallSpeed * Math.sqrt(1 - bounceAngle * bounceAngle) * direction;

	// Impart spin based on paddle velocity at moment of contact
	state.ballSpin = (paddleVY / PADDLE_SPEED) * SPIN_FACTOR;

	// Push ball away from paddle
	if (direction === 1) {
		state.ballX = PADDLE_OFFSET + PADDLE_WIDTH + BALL_RADIUS;
	} else {
		state.ballX = CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH - BALL_RADIUS;
	}

	// Track rally stats
	state.ballReturns++;
	if (state.ballReturns > state.longestRally) {
		state.longestRally = state.ballReturns;
	}
	if (state.currentBallSpeed > state.maxBallSpeedReached) {
		state.maxBallSpeedReached = state.currentBallSpeed;
	}
}

function checkScoring(state: GameState, settings: GameSettings): void {
	// Ball past left edge → Player 2 / Computer scores
	if (state.ballX + BALL_RADIUS < 0) {
		state.score2++;
		state.scoreFlash = 'right';
		state.scoreFlashTimer = 0.5;
		state.ballReturns = 0;

		// Track max deficit for player 1
		const deficit = state.score2 - state.score1;
		if (deficit > state.maxDeficit) state.maxDeficit = deficit;

		// Check deuce
		if (state.score1 >= settings.winScore - 1 && state.score2 >= settings.winScore - 1) {
			state.reachedDeuce = true;
		}

		const scorer = settings.gameMode === 'computer' ? 'Computer' : 'Player 2';
		if (state.score2 >= settings.winScore) {
			endGame(state, scorer);
		} else {
			state.scorePause = SCORE_PAUSE_DURATION;
			resetBall(state, settings);
		}
	}

	// Ball past right edge → Player 1 scores
	if (state.ballX - BALL_RADIUS > CANVAS_WIDTH) {
		state.score1++;
		state.scoreFlash = 'left';
		state.scoreFlashTimer = 0.5;
		state.ballReturns = 0;

		// Check deuce
		if (state.score1 >= settings.winScore - 1 && state.score2 >= settings.winScore - 1) {
			state.reachedDeuce = true;
		}

		if (state.score1 >= settings.winScore) {
			endGame(state, 'Player 1');
		} else {
			state.scorePause = SCORE_PAUSE_DURATION;
			resetBall(state, settings);
		}
	}
}

export function computeComputerInput(state: GameState, settings: GameSettings): InputState {
	const config = DIFFICULTY_CONFIGS[settings.difficulty];
	const paddleCenter = state.paddle2Y + PADDLE_HEIGHT / 2;
	const deadZone = config.deadZone;

	const ballApproaching = state.ballVX > 0;

	let moveUp = false;
	let moveDown = false;

	if (ballApproaching) {
		// Ball coming toward us → track it
		if (state.ballY < paddleCenter - deadZone) {
			moveUp = true;
		} else if (state.ballY > paddleCenter + deadZone) {
			moveDown = true;
		}
	} else {
		// Ball moving away → drift toward center
		const canvasCenter = CANVAS_HEIGHT / 2;
		if (paddleCenter < canvasCenter - 30) {
			moveDown = true;
		} else if (paddleCenter > canvasCenter + 30) {
			moveUp = true;
		}
	}

	return {
		paddle1Up: false,    // Computer doesn't control paddle 1
		paddle1Down: false,
		paddle2Up: moveUp,
		paddle2Down: moveDown,
	};
}