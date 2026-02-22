export type GamePhase = 'menu' | 'countdown' | 'playing' | 'gameover';

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
}


export type GameMode = 'local' | 'computer';

export type SpeedPreset = 'chill' | 'normal' | 'fast';

export const SPEED_CONFIGS: Record<SpeedPreset, { ballSpeed: number; maxBallSpeed: number }> = {
	chill: { ballSpeed: 200, maxBallSpeed: 400 },
	normal: { ballSpeed: 300, maxBallSpeed: 600 },
	fast: { ballSpeed: 400, maxBallSpeed: 800 },
};

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;
export const PADDLE_WIDTH = 10;
export const PADDLE_HEIGHT = 80;
export const PADDLE_OFFSET = 30;
export const PADDLE_SPEED = 400;
export const BALL_RADIUS = 8;
export const BALL_SPEED_INCREMENT = 20;
export const MAX_BOUNCE_ANGLE = 0.75;
export const SCORE_PAUSE_DURATION = 0.8;

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
}

/** Reset ball to center (between points, not full reset) */
function resetBall(state: GameState, settings: GameSettings): void {
	state.ballX = CANVAS_WIDTH / 2;
	state.ballY = CANVAS_HEIGHT / 2;
	state.currentBallSpeed = settings.ballSpeed;
	const direction = Math.random() > 0.5 ? 1 : -1;
	state.ballVX = settings.ballSpeed * direction;
	state.ballVY = settings.ballSpeed * (Math.random() - 0.5);
}

export function update(
	state: GameState,
	dt: number,
	input: InputState,
	settings: GameSettings
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
			updateCountdown(state, dt, input);
			break;
		case 'playing':
			updatePlaying(state, dt, input, settings);
			break;
		// 'menu' and 'gameover': nothing to update
	}
}

function updateCountdown(state: GameState, dt: number, input: InputState): void {
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

	// Paddles can move during countdown
	movePaddles(state, dt, input);
}

function updatePlaying(
	state: GameState,
	dt: number,
	input: InputState,
	settings: GameSettings
): void {
	// Track total play time
	state.playTime += dt;

	// Score pause
	if (state.scorePause > 0) {
		state.scorePause -= dt;
		return;
	}

	// Move paddles
	movePaddles(state, dt, input);

	// Move ball
	state.ballX += state.ballVX * dt;
	state.ballY += state.ballVY * dt;

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
	checkPaddleCollision(state, settings);

	// Scoring
	checkScoring(state, settings);
}

function movePaddles(state: GameState, dt: number, input: InputState): void {
	if (input.paddle1Up) state.paddle1Y -= PADDLE_SPEED * dt;
	if (input.paddle1Down) state.paddle1Y += PADDLE_SPEED * dt;
	if (input.paddle2Up) state.paddle2Y -= PADDLE_SPEED * dt;
	if (input.paddle2Down) state.paddle2Y += PADDLE_SPEED * dt;

	// Clamp to canvas bounds
	state.paddle1Y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, state.paddle1Y));
	state.paddle2Y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, state.paddle2Y));
}

function checkPaddleCollision(state: GameState, settings: GameSettings): void {
	// Left paddle
	if (
		state.ballVX < 0 &&
		state.ballX - BALL_RADIUS <= PADDLE_OFFSET + PADDLE_WIDTH &&
		state.ballX + BALL_RADIUS >= PADDLE_OFFSET &&
		state.ballY + BALL_RADIUS >= state.paddle1Y &&
		state.ballY - BALL_RADIUS <= state.paddle1Y + PADDLE_HEIGHT
	) {
		state.ballReturns++;
		handlePaddleBounce(state, state.paddle1Y, 1, settings);
	}

	// Right paddle
	const p2Left = CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
	if (
		state.ballVX > 0 &&
		state.ballX + BALL_RADIUS >= p2Left &&
		state.ballX - BALL_RADIUS <= CANVAS_WIDTH - PADDLE_OFFSET &&
		state.ballY + BALL_RADIUS >= state.paddle2Y &&
		state.ballY - BALL_RADIUS <= state.paddle2Y + PADDLE_HEIGHT
	) {
		state.ballReturns++;
		handlePaddleBounce(state, state.paddle2Y, -1, settings);
	}
}

function handlePaddleBounce(
	state: GameState,
	paddleY: number,
	direction: number,
	settings: GameSettings
): void {
	const paddleCenter = paddleY + PADDLE_HEIGHT / 2;
	const offset = (state.ballY - paddleCenter) / (PADDLE_HEIGHT / 2);
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

	// Push ball away from paddle
	if (direction === 1) {
		state.ballX = PADDLE_OFFSET + PADDLE_WIDTH + BALL_RADIUS;
	} else {
		state.ballX = CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH - BALL_RADIUS;
	}
}

function checkScoring(state: GameState, settings: GameSettings): void {
	// Ball past left edge → Player 2 / Computer scores
	if (state.ballX + BALL_RADIUS < 0) {
		state.score2++;
		state.scoreFlash = 'right';
		state.scoreFlashTimer = 0.5;

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

export function computeComputerInput(state: GameState): InputState {
	const paddleCenter = state.paddle2Y + PADDLE_HEIGHT / 2;
	const deadZone = 20;

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