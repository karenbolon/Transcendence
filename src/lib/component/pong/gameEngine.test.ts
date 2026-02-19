// src/lib/component/pong/gameEngine.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
	type GameState,
	type InputState,
	type GameSettings,
	type SpeedPreset,
	SPEED_CONFIGS,
	CANVAS_WIDTH,
	CANVAS_HEIGHT,
	PADDLE_HEIGHT,
	PADDLE_WIDTH,
	PADDLE_OFFSET,
	PADDLE_SPEED,
	BALL_RADIUS,
	BALL_SPEED_INCREMENT,
	MAX_BOUNCE_ANGLE,
	SCORE_PAUSE_DURATION,
	createGameState,
	startCountdown,
	startPlaying,
	endGame,
	returnToMenu,
	update,
	computeComputerInput
} from './gameEngine';

describe('gameEngine - SPEED_CONFIGS', () => {
	describe('Configuration Structure', () => {
		it('should have all three speed presets defined', () => {
			const presets: SpeedPreset[] = ['chill', 'normal', 'fast'];
			presets.forEach((preset) => {
				expect(SPEED_CONFIGS[preset]).toBeDefined();
				expect(SPEED_CONFIGS[preset]).toHaveProperty('ballSpeed');
				expect(SPEED_CONFIGS[preset]).toHaveProperty('maxBallSpeed');
			});
		});

		it('should have exactly two properties per preset', () => {
			Object.values(SPEED_CONFIGS).forEach((config) => {
				expect(Object.keys(config)).toHaveLength(2);
			});
		});

		it('should have number values for all properties', () => {
			Object.values(SPEED_CONFIGS).forEach((config) => {
				expect(typeof config.ballSpeed).toBe('number');
				expect(typeof config.maxBallSpeed).toBe('number');
			});
		});
	});

	describe('Preset Values', () => {
		it('should have correct chill preset values', () => {
			expect(SPEED_CONFIGS.chill.ballSpeed).toBe(200);
			expect(SPEED_CONFIGS.chill.maxBallSpeed).toBe(400);
		});

		it('should have correct normal preset values', () => {
			expect(SPEED_CONFIGS.normal.ballSpeed).toBe(300);
			expect(SPEED_CONFIGS.normal.maxBallSpeed).toBe(600);
		});

		it('should have correct fast preset values', () => {
			expect(SPEED_CONFIGS.fast.ballSpeed).toBe(400);
			expect(SPEED_CONFIGS.fast.maxBallSpeed).toBe(800);
		});
	});

	describe('Speed Progression', () => {
		it('should have increasing ballSpeed from chill to fast', () => {
			expect(SPEED_CONFIGS.normal.ballSpeed).toBeGreaterThan(SPEED_CONFIGS.chill.ballSpeed);
			expect(SPEED_CONFIGS.fast.ballSpeed).toBeGreaterThan(SPEED_CONFIGS.normal.ballSpeed);
		});

		it('should have increasing maxBallSpeed from chill to fast', () => {
			expect(SPEED_CONFIGS.normal.maxBallSpeed).toBeGreaterThan(
				SPEED_CONFIGS.chill.maxBallSpeed
			);
			expect(SPEED_CONFIGS.fast.maxBallSpeed).toBeGreaterThan(
				SPEED_CONFIGS.normal.maxBallSpeed
			);
		});
	});

	describe('Value Constraints', () => {
		it('should have maxBallSpeed greater than ballSpeed for all presets', () => {
			Object.values(SPEED_CONFIGS).forEach((config) => {
				expect(config.maxBallSpeed).toBeGreaterThan(config.ballSpeed);
			});
		});

		it('should have positive values for all configs', () => {
			Object.values(SPEED_CONFIGS).forEach((config) => {
				expect(config.ballSpeed).toBeGreaterThan(0);
				expect(config.maxBallSpeed).toBeGreaterThan(0);
			});
		});

		it('should allow sufficient speed increments', () => {
			Object.values(SPEED_CONFIGS).forEach((config) => {
				const incrementsNeeded =
					(config.maxBallSpeed - config.ballSpeed) / BALL_SPEED_INCREMENT;
				expect(incrementsNeeded).toBeGreaterThanOrEqual(5);
			});
		});
	});
});

describe('gameEngine - Constants', () => {
	it('should have valid canvas dimensions', () => {
		expect(CANVAS_WIDTH).toBe(800);
		expect(CANVAS_HEIGHT).toBe(500);
	});

	it('should have valid paddle dimensions', () => {
		expect(PADDLE_WIDTH).toBe(10);
		expect(PADDLE_HEIGHT).toBe(80);
		expect(PADDLE_OFFSET).toBe(30);
		expect(PADDLE_SPEED).toBe(400);
	});

	it('should have valid ball properties', () => {
		expect(BALL_RADIUS).toBe(8);
		expect(BALL_SPEED_INCREMENT).toBe(20);
		expect(MAX_BOUNCE_ANGLE).toBe(0.75);
		expect(SCORE_PAUSE_DURATION).toBe(0.8);
	});
});

describe('gameEngine - State Initialization', () => {
	let state: GameState;

	beforeEach(() => {
		state = createGameState();
	});

	it('should create initial state in menu phase', () => {
		expect(state.phase).toBe('menu');
	});

	it('should center paddles vertically', () => {
		const expectedY = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
		expect(state.paddle1Y).toBe(expectedY);
		expect(state.paddle2Y).toBe(expectedY);
	});

	it('should center ball', () => {
		expect(state.ballX).toBe(CANVAS_WIDTH / 2);
		expect(state.ballY).toBe(CANVAS_HEIGHT / 2);
	});

	it('should initialize ball with zero velocity', () => {
		expect(state.ballVX).toBe(0);
		expect(state.ballVY).toBe(0);
		expect(state.currentBallSpeed).toBe(0);
	});

	it('should initialize scores to zero', () => {
		expect(state.score1).toBe(0);
		expect(state.score2).toBe(0);
	});

	it('should initialize game metadata', () => {
		expect(state.winner).toBe('');
		expect(state.playTime).toBe(0);
	});
});

describe('gameEngine - Phase Transitions', () => {
	let state: GameState;
	let settings: GameSettings;

	beforeEach(() => {
		state = createGameState();
		settings = {
			winScore: 5,
			ballSpeed: 300,
			maxBallSpeed: 600,
			gameMode: 'local'
		};
	});

	describe('startCountdown()', () => {
		it('should transition to countdown phase', () => {
			startCountdown(state, settings);
			expect(state.phase).toBe('countdown');
		});

		it('should set countdown timer', () => {
			startCountdown(state, settings);
			expect(state.countdownTimer).toBe(3.5);
			expect(state.countdownDisplay).toBe('3');
		});

		it('should reset positions', () => {
			state.paddle1Y = 100;
			state.ballX = 100;

			startCountdown(state, settings);

			expect(state.paddle1Y).toBe(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
			expect(state.ballX).toBe(CANVAS_WIDTH / 2);
		});

		it('should set current ball speed from settings', () => {
			startCountdown(state, settings);
			expect(state.currentBallSpeed).toBe(settings.ballSpeed);
		});
	});

	describe('startPlaying()', () => {
		it('should transition to playing phase', () => {
			startPlaying(state, settings);
			expect(state.phase).toBe('playing');
		});

		it('should set ball velocity', () => {
			startPlaying(state, settings);
			expect(Math.abs(state.ballVX)).toBe(settings.ballSpeed);
			expect(state.ballVY).not.toBe(0);
		});

		it('should randomly choose ball direction', () => {
			const directions = new Set<number>();
			for (let i = 0; i < 20; i++) {
				const testState = createGameState();
				startPlaying(testState, settings);
				directions.add(Math.sign(testState.ballVX));
			}
			expect(directions.size).toBeGreaterThan(1);
		});
	});

	describe('endGame()', () => {
		it('should transition to gameover and stop ball', () => {
			state.ballVX = 300;
			endGame(state, 'Player 1');

			expect(state.phase).toBe('gameover');
			expect(state.winner).toBe('Player 1');
			expect(state.ballVX).toBe(0);
		});
	});

	describe('returnToMenu()', () => {
		it('should reset to menu phase', () => {
			state.score1 = 5;
			state.winner = 'Player 1';

			returnToMenu(state);

			expect(state.phase).toBe('menu');
			expect(state.score1).toBe(0);
			expect(state.winner).toBe('');
		});
	});
});

describe('gameEngine - Gameplay', () => {
	let state: GameState;
	let input: InputState;
	let settings: GameSettings;

	beforeEach(() => {
		state = createGameState();
		state.phase = 'playing';
		state.ballVX = 300;
		state.ballVY = 150;
		input = { paddle1Up: false, paddle1Down: false, paddle2Up: false, paddle2Down: false };
		settings = { winScore: 5, ballSpeed: 300, maxBallSpeed: 600, gameMode: 'local' };
	});

	it('should move ball based on velocity', () => {
		const initialX = state.ballX;
		update(state, 0.1, input, settings);
		expect(state.ballX).toBeCloseTo(initialX + 30, 1);
	});

	it('should move paddle up', () => {
		input.paddle1Up = true;
		const initialY = state.paddle1Y;
		update(state, 0.1, input, settings);
		expect(state.paddle1Y).toBeLessThan(initialY);
	});

	it('should clamp paddle at boundaries', () => {
		state.paddle1Y = 10;
		input.paddle1Up = true;
		update(state, 1.0, input, settings);
		expect(state.paddle1Y).toBe(0);
	});

	it('should bounce ball off walls', () => {
		state.ballY = BALL_RADIUS - 1;
		state.ballVY = -100;
		update(state, 0.1, input, settings);
		expect(state.ballVY).toBeGreaterThan(0);
	});

	it('should score when ball exits', () => {
		state.ballX = CANVAS_WIDTH + BALL_RADIUS + 1;
		update(state, 0.01, input, settings);
		expect(state.score1).toBe(1);
		expect(state.scoreFlash).toBe('left');
	});

	it('should end game at win score', () => {
		state.score1 = 4;
		state.ballX = CANVAS_WIDTH + BALL_RADIUS + 1;
		update(state, 0.01, input, settings);
		expect(state.phase).toBe('gameover');
	});
});

describe('gameEngine - Computer AI', () => {
	let state: GameState;

	beforeEach(() => {
		state = createGameState();
	});

	it('should track ball when approaching', () => {
		state.ballVX = 100;
		state.ballY = 100;
		state.paddle2Y = 250;

		const input = computeComputerInput(state);
		expect(input.paddle2Up).toBe(true);
	});

	it('should not move in dead zone', () => {
		state.ballVX = 100;
		state.ballY = CANVAS_HEIGHT / 2;
		state.paddle2Y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;

		const input = computeComputerInput(state);
		expect(input.paddle2Up).toBe(false);
		expect(input.paddle2Down).toBe(false);
	});

	it('should never control paddle 1', () => {
		const input = computeComputerInput(state);
		expect(input.paddle1Up).toBe(false);
		expect(input.paddle1Down).toBe(false);
	});
});
