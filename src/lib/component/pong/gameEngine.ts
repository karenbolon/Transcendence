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


export type GameMode = 'local' | 'computer' | 'online';

export type SpeedPreset = 'chill' | 'normal' | 'fast';

export const SPEED_CONFIGS: Record<SpeedPreset, { ballSpeed: number; maxBallSpeed: number }> = {
	chill:  { ballSpeed: 200, maxBallSpeed: 400 },
	normal: { ballSpeed: 500, maxBallSpeed: 600 },
	fast:   { ballSpeed: 700, maxBallSpeed: 1100 },
};

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;
export const PADDLE_WIDTH = 10;
export const PADDLE_HEIGHT = 80;
export const PADDLE_OFFSET = 30;
export const PADDLE_SPEED = 500;
export const BALL_RADIUS = 8;
export const BALL_SPEED_INCREMENT = 30;
export const MAX_BOUNCE_ANGLE = 0.89;
export const SCORE_PAUSE_DURATION = 0.9;
export const SPIN_FACTOR = 0.6;       // How much paddle velocity transfers to spin
export const SPIN_ACCELERATION = 800;  // How strongly spin curves the ball (px/s²)
export const SPIN_DECAY = 0.97;        // Spin fades slightly each frame (friction)

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
	goLabel: string = 'GO!'
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
			updateCountdown(state, dt, input, goLabel);
			break;
		case 'playing':
			updatePlaying(state, dt, input, settings);
			break;
		// 'menu' and 'gameover': nothing to update
	}
}

function updateCountdown(state: GameState, dt: number, input: InputState, goLabel: string): void {
	state.countdownTimer -= dt;

	if (state.countdownTimer > 3)      state.countdownDisplay = '3';
	else if (state.countdownTimer > 2) state.countdownDisplay = '2';
	else if (state.countdownTimer > 1) state.countdownDisplay = '1';
	else if (state.countdownTimer > 0) state.countdownDisplay = goLabel;
	else {
		// Timer finished — will be caught by the component to call startPlaying()
		state.countdownDisplay = goLabel;
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

	// Move paddles FIRST — players should always be able to move
	movePaddles(state, dt, input);

	// Score pause
	if (state.scorePause > 0) {
		state.scorePause -= dt;
		return;
	}

	// Move paddles
	// movePaddles(state, dt, input);

	// Apply spin: curves the ball trajectory over time
	state.ballVY += state.ballSpin * SPIN_ACCELERATION * dt;
	state.ballSpin *= SPIN_DECAY;

	// Dampen tiny spin values to zero
	if (Math.abs(state.ballSpin) < 0.001) state.ballSpin = 0;

	// Update visual rotation
	state.ballRotation += state.ballSpin * 15 * dt;

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
	const prevP1Y = state.paddle1Y;
	const prevP2Y = state.paddle2Y;

	if (input.paddle1Up)   state.paddle1Y -= PADDLE_SPEED * dt;
	if (input.paddle1Down) state.paddle1Y += PADDLE_SPEED * dt;
	if (input.paddle2Up)   state.paddle2Y -= PADDLE_SPEED * dt;
	if (input.paddle2Down) state.paddle2Y += PADDLE_SPEED * dt;

	// Clamp to canvas bounds
	state.paddle1Y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, state.paddle1Y));
	state.paddle2Y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, state.paddle2Y));

	// Track paddle velocities for spin calculation
	state.paddle1VY = dt > 0 ? (state.paddle1Y - prevP1Y) / dt : 0;
	state.paddle2VY = dt > 0 ? (state.paddle2Y - prevP2Y) / dt : 0;
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
		handlePaddleBounce(state, state.paddle1Y, 1, settings, state.paddle1VY);
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
		handlePaddleBounce(state, state.paddle2Y, -1, settings, state.paddle2VY);
	}
}

function handlePaddleBounce(
	state: GameState,
	paddleY: number,
	direction: number,
	settings: GameSettings,
	paddleVY: number
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

	// Impart spin based on paddle velocity at moment of contact
	// Moving paddle up (negative VY) → negative spin (curves ball upward)
	// Moving paddle down (positive VY) → positive spin (curves ball downward)
	state.ballSpin = (paddleVY / PADDLE_SPEED) * SPIN_FACTOR;

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

		if (state.score1 >= settings.winScore) {
			endGame(state, 'Player 1');
		} else {
			state.scorePause = SCORE_PAUSE_DURATION;
			resetBall(state, settings);
		}
	}
}

// AI difficulty settings — tweak these to adjust how good the computer is
const AI_ERROR_RANGE = 80;    // ±px of random error added to prediction (higher = worse aim)
const AI_REACTION_FRAMES = 8; // AI only updates its target every N frames (higher = slower reaction)

// Persistent AI state between frames
let aiTargetY: number = CANVAS_HEIGHT / 2;
let aiFrameCounter: number = 0;

/**
 * Fuzzy Logic AI Controller for Computer Paddle
 *
 * Implements prediction-based targeting with smooth movement:
 * 1. Fuzzification: Predict ball trajectory including wall bounces
 * 2. Inference: Determine target position based on ball approach state
 * 3. Defuzzification: Apply dead zone tolerance for smooth movement
 */
export function computeComputerInput(state: GameState): InputState {
	const paddleCenter = state.paddle2Y + PADDLE_HEIGHT / 2;
	const deadZone = 30; // Fuzzy tolerance zone (±30px = "close enough")

	// Only recalculate target every AI_REACTION_FRAMES frames (simulates reaction delay)
	aiFrameCounter++;
	if (aiFrameCounter >= AI_REACTION_FRAMES) {
		aiFrameCounter = 0;

		let targetY: number;

		// Rule 1: Ball approaching → Use predictive tracking
		if (state.ballVX > 0) {
			const paddleX = CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
			const distanceToPaddle = paddleX - state.ballX;
			const timeToReach = distanceToPaddle / state.ballVX;

			// Predict future ball position (account for spin curving the trajectory)
			// Spin adds acceleration over time: y = y0 + vy*t + 0.5*spin*SPIN_ACCELERATION*t²
			// THIS IS A BIT HACKY BUT THE PHYSICS IS OVER MY HEAD
			let predictedY = state.ballY
				+ (state.ballVY * timeToReach)
				+ (0.5 * state.ballSpin * SPIN_ACCELERATION * timeToReach * timeToReach);

			// Simulate wall bounces with safety limit (prevent infinite loops)
			let bounces = 0;
			const maxBounces = 10; // Safety limit

			while ((predictedY < 0 || predictedY > CANVAS_HEIGHT) && bounces < maxBounces) {
				if (predictedY < 0) {
					predictedY = Math.abs(predictedY);
				} else if (predictedY > CANVAS_HEIGHT) {
					predictedY = 2 * CANVAS_HEIGHT - predictedY;
				}
				bounces++;
			}

			// Clamp if still out of bounds (safety fallback)
			predictedY = Math.max(0, Math.min(CANVAS_HEIGHT, predictedY));

			// Add random error so the AI doesn't aim perfectly every time
			const error = (Math.random() * 2 - 1) * AI_ERROR_RANGE;
			targetY = predictedY + error;
		}
		// Rule 2: Ball moving away → Return to center (defensive positioning)
		else {
			targetY = CANVAS_HEIGHT / 2;
		}

		// Defuzzification: Constrain target to valid paddle bounds
		// Extend range by deadZone so the paddle can fully reach the top/bottom edges
		aiTargetY = Math.max(
			PADDLE_HEIGHT / 2 - deadZone,
			Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT / 2 + deadZone, targetY)
		);
	}

	// Fuzzy decision: Only move if outside dead zone (prevents oscillation)
	const moveUp = aiTargetY < paddleCenter - deadZone;
	const moveDown = aiTargetY > paddleCenter + deadZone;

	return {
		paddle1Up: false,
		paddle1Down: false,
		paddle2Up: moveUp,
		paddle2Down: moveDown,
	};
}
