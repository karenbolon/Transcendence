<script lang="ts">
	import { onMount } from "svelte";
	import { _ } from "svelte-i18n";
	import {
		type GameState,
		type GameSettings,
		type GameModifiers,
		type InputState,
		createGameState,
		update,
		startCountdown,
		startPlaying,
		pauseGame,
		resumeGame,
		returnToMenu,
		computeComputerInput,
		endGame,
		SCORE_PAUSE_DURATION,
		DEFAULT_MODIFIERS,
		CANVAS_WIDTH,
		CANVAS_HEIGHT,
		PADDLE_WIDTH,
		PADDLE_HEIGHT,
		PADDLE_OFFSET,
		BALL_RADIUS,
	} from "./gameEngine";
	import {
		type EffectsState,
		createEffectsState,
		resetEffects,
		emitEvent,
		updateEffects,
		updateTrail,
		clearTrail,
		drawTrail,
		drawParticles,
		SoundEngine,
	} from './effectsEngine';
	import { type CourtThemeName, COURT_THEMES, hexToRgb } from './courtThemes';
	import {
		type PowerUpState,
		createPowerUpState,
		resetPowerUps,
		updatePowerUps,
		setLastHitBy,
		getEffectivePaddleHeight,
		getBallSpeedMultiplier,
		getPaddleSpeedMultiplier,
		drawSpawnedPowerUp,
		drawGhostBalls,
		drawActiveEffects,
	} from './powerUp';

	type Props = {
		settings: GameSettings;
		courtTheme?: CourtThemeName;
		powerUpsEnabled?: boolean;
		onGameOver?: (result: {
			score1: number;
			score2: number;
			winner: "player1" | "player2";
			durationSeconds: number;
			ballReturns: number;
			longestRally: number;
			maxDeficit: number;
			reachedDeuce: boolean;
		}) => void;
		playerSide?: 'left' | 'right';
		onInputChange?: (direction: 'up' | 'down' | 'none') => void;
		onPauseRequest?: () => void;
		onQuitRequest?: () => void;
	};

	let { settings, courtTheme = 'classic', powerUpsEnabled = false, onGameOver, playerSide = 'left', onInputChange, onPauseRequest, onQuitRequest }: Props = $props();
	let theme = $derived(COURT_THEMES[courtTheme]);
	let game = $state<GameState>(createGameState());
	let confirmingQuit = $state(false);
	let phaseBeforePause = $state<'playing' | 'countdown'>('playing');

	// Effects — NOT reactive ($state) because they're only used in canvas rendering,
	// not in the Svelte template. Making them reactive causes lag from per-frame reactivity overhead.
	let effects: EffectsState = createEffectsState();
	let powerUps: PowerUpState = createPowerUpState();
	const sound = new SoundEngine();
	let soundMuted = $state(false);

	function toggleMute() {
		soundMuted = !soundMuted;
		sound.muted = soundMuted;
	}

	export function getGameState(): GameState {
		return game;
	}

	/** Start a new game with same settings (rematch) */
	export function rematch(): void {
		returnToMenu(game);
		clearTrail(effects);
		resetEffects(effects);
		resetPowerUps(powerUps);
		startCountdown(game, settings);
	}

	/** Return to menu */
	export function goToMenu(): void {
		returnToMenu(game);
		clearTrail(effects);
		resetEffects(effects);
		resetPowerUps(powerUps);
	}


	let canvas: HTMLCanvasElement;
	let lastTime = 0;
	let animationId = 0;
	let running = true;

	const keysDown = new Set<string>();

	const uiText = $derived({
		escQuit: $_("canvas_game.esc_quit"),
		pressSpace: $_("canvas_game.press_space"),
		controlsReminder: $_("canvas_game.controls_reminder"),
		gameOver: $_("canvas_game.game_over"),
	});

	function getInput(): InputState {
		const humanInput: InputState = {
			paddle1Up: keysDown.has("w"),
			paddle1Down: keysDown.has("s"),
			paddle2Up: keysDown.has("arrowup"),
			paddle2Down: keysDown.has("arrowdown"),
		};

		if (settings.gameMode === "computer") {
			const aiInput = computeComputerInput(game, settings);
			humanInput.paddle2Up = aiInput.paddle2Up;
			humanInput.paddle2Down = aiInput.paddle2Down;
		}

		return humanInput;
	}

	function handleKeyDown(e: KeyboardEvent) {
		sound.init();
		//TODO online mode.


		const key = e.key.toLowerCase();
		keysDown.add(key);

		if (["arrowup", "arrowdown"].includes(key)) {
			e.preventDefault();
		}

		if (key === 'escape') {
			if (game.phase === 'playing' || game.phase === 'countdown') {
				phaseBeforePause = game.phase;
				pauseGame(game);
				confirmingQuit = true;
			} else if (game.phase === 'paused' && confirmingQuit) {
				confirmingQuit = false;
				returnToMenu(game);
				clearTrail(effects);
				resetPowerUps(powerUps);
			} else if (game.phase === 'paused') {
				confirmingQuit = true;
			}
		}

		// SPACE → State transitions
		if (key === ' ' || key === 'space') {
			e.preventDefault();
			if (game.phase === 'menu') {
				startCountdown(game, settings);
				resetEffects(effects);
				resetPowerUps(powerUps);
			} else if (game.phase === 'playing') {
				phaseBeforePause = 'playing';
				pauseGame(game);
			} else if (game.phase === 'paused') {
				confirmingQuit = false;
				game.phase = phaseBeforePause;
			} else if (game.phase === 'gameover') {
				returnToMenu(game);
				clearTrail(effects);
				resetEffects(effects);
				resetPowerUps(powerUps);
				startCountdown(game, settings);
			}
		}
	}

	function handleKeyUp(e: KeyboardEvent) {
		//TODO: handle online mode
		keysDown.delete(e.key.toLowerCase());
	}

	onMount(() => {
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		animationId = requestAnimationFrame((timestamp) => {
			lastTime = timestamp;
			gameLoop(ctx, timestamp);
		});

		return () => {
			running = false;
			cancelAnimationFrame(animationId);
		};
	});

	function gameLoop(ctx: CanvasRenderingContext2D, timestamp: number) {
		const dt = (timestamp - lastTime) / 1000;
		lastTime = timestamp;
		const safeDt = Math.min(dt, 0.05);

		//TODO: Online mode
		if (settings.gameMode !== 'online') {
			const input = getInput();
			const prevPhase = game.phase;
			const prevBallVX = game.ballVX;
			const prevBallVY = game.ballVY;
			const prevScore1 = game.score1;
			const prevScore2 = game.score2;
			const prevCountdown = game.countdownDisplay;

			// Build modifiers from active power-ups
			const modifiers: GameModifiers = powerUpsEnabled
				? {
					paddle1Height: getEffectivePaddleHeight(powerUps, 1),
					paddle2Height: getEffectivePaddleHeight(powerUps, 2),
					ballSpeedMultiplier: getBallSpeedMultiplier(powerUps),
					paddle1SpeedMultiplier: getPaddleSpeedMultiplier(powerUps, 1),
					paddle2SpeedMultiplier: getPaddleSpeedMultiplier(powerUps, 2),
				}
				: DEFAULT_MODIFIERS;

			update(game, safeDt, input, settings, modifiers);

			if (game.phase === "countdown" && game.countdownTimer <= 0) {
				startPlaying(game, settings);
			}

			// ── Event detection ──────────────────────────
			// Paddle hit: ballVX sign flipped while playing
			if (game.phase === 'playing' && prevBallVX !== 0 && Math.sign(game.ballVX) !== Math.sign(prevBallVX)) {
				if (game.ballVX > 0) {
					emitEvent(effects, { type: 'paddleHit', side: 'left', x: game.ballX, y: game.ballY });
				} else {
					emitEvent(effects, { type: 'paddleHit', side: 'right', x: game.ballX, y: game.ballY });
				}
				sound.paddleHit();
			}

			// Wall bounce: ballVY sign flipped while playing
			if (game.phase === 'playing' && prevBallVY !== 0 && Math.sign(game.ballVY) !== Math.sign(prevBallVY)) {
				const wall = game.ballVY > 0 ? 'top' : 'bottom';
				emitEvent(effects, { type: 'wallBounce', x: game.ballX, y: game.ballY, wall });
				sound.wallBounce();
			}

			// Score
			if (game.score1 > prevScore1) {
				emitEvent(effects, { type: 'score', side: 'left' });
				sound.score();
			}
			if (game.score2 > prevScore2) {
				emitEvent(effects, { type: 'score', side: 'right' });
				sound.score();
			}

			// Countdown beeps
			if (game.phase === 'countdown' && game.countdownDisplay !== prevCountdown) {
				if (game.countdownDisplay === 'GO!') {
					sound.goBeep();
				} else if (['3', '2', '1'].includes(game.countdownDisplay)) {
					sound.countdownBeep();
				}
			}

			if (game.phase === "gameover" && prevPhase === "playing") {
				onGameOver?.({
					score1: game.score1,
					score2: game.score2,
					winner: game.score1 > game.score2 ? "player1" : "player2",
					durationSeconds: Math.round(game.playTime),
					ballReturns: game.ballReturns,
					longestRally: game.longestRally,
					maxDeficit: game.maxDeficit,
					reachedDeuce: game.reachedDeuce,
				});
			}
			// Power-ups
			if (powerUpsEnabled) {
				if (game.phase === 'playing' && prevBallVX !== 0 && Math.sign(game.ballVX) !== Math.sign(prevBallVX)) {
					setLastHitBy(powerUps, game.ballVX > 0 ? 1 : 2);
				}
				const prevSpawned = powerUps.spawned;
				updatePowerUps(powerUps, game, safeDt);
				if (prevSpawned && !powerUps.spawned) {
					sound.powerUpCollect();
				}

				// Handle ghost ball scoring
				if (powerUps.pendingGhostScore !== null) {
					const scorer = powerUps.pendingGhostScore;
					powerUps.pendingGhostScore = null;

					if (scorer === 1) {
						game.score1++;
						game.scoreFlash = 'left';
					} else {
						game.score2++;
						game.scoreFlash = 'right';
					}
					game.scoreFlashTimer = 0.5;
					game.ballReturns = 0;
					emitEvent(effects, { type: 'score', side: scorer === 1 ? 'left' : 'right' });
					sound.score();

					// Check win condition
					if (game.score1 >= settings.winScore) {
						endGame(game, 'Player 1');
						onGameOver?.({
							score1: game.score1,
							score2: game.score2,
							winner: 'player1',
							durationSeconds: Math.round(game.playTime),
							ballReturns: game.ballReturns,
							longestRally: game.longestRally,
							maxDeficit: game.maxDeficit,
							reachedDeuce: game.reachedDeuce,
						});
					} else if (game.score2 >= settings.winScore) {
						const winnerName = settings.gameMode === 'computer' ? 'Computer' : 'Player 2';
						endGame(game, winnerName);
						onGameOver?.({
							score1: game.score1,
							score2: game.score2,
							winner: 'player2',
							durationSeconds: Math.round(game.playTime),
							ballReturns: game.ballReturns,
							longestRally: game.longestRally,
							maxDeficit: game.maxDeficit,
							reachedDeuce: game.reachedDeuce,
						});
					} else {
						// Pause and reset ball like normal scoring
						game.scorePause = SCORE_PAUSE_DURATION;
						game.ballX = CANVAS_WIDTH / 2;
						game.ballY = CANVAS_HEIGHT / 2;
						game.currentBallSpeed = settings.ballSpeed;
						game.ballSpin = 0;
						const dir = Math.random() > 0.5 ? 1 : -1;
						game.ballVX = settings.ballSpeed * dir;
						game.ballVY = settings.ballSpeed * (Math.random() - 0.5);
					}
				}
			}
		}
		// Update effects
		updateEffects(effects, safeDt);

		// Update ball trail (only during active gameplay)
		if (game.phase === 'playing' || game.phase === 'countdown') {
			updateTrail(effects, game.ballX, game.ballY);
		}

		draw(ctx);
		if (running) {
			animationId = requestAnimationFrame((t) => gameLoop(ctx, t));
		}
	}

	function draw(ctx: CanvasRenderingContext2D) {
		const accentRgb = hexToRgb(theme.accent);
		const paddleRgb = hexToRgb(theme.paddle);
		const bgRgb = hexToRgb(theme.background);

		ctx.fillStyle = theme.background;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Apply screen shake
		ctx.save();
		if (effects.shakeTimer > 0) {
			ctx.translate(effects.shakeOffsetX, effects.shakeOffsetY);
		}

		if (game.scoreFlash) {
			const flashOpacity = Math.max(0, (game.scoreFlashTimer / 0.5) * 0.15);
			ctx.fillStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${flashOpacity})`;
			if (game.scoreFlash === "left") {
				ctx.fillRect(0, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT);
			} else {
				ctx.fillRect(CANVAS_WIDTH / 2, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT);
			}
		}

		ctx.strokeStyle = theme.centerLine;
		ctx.lineWidth = 2;
		ctx.setLineDash([15, 10]);
		ctx.beginPath();
		ctx.moveTo(CANVAS_WIDTH / 2, 0);
		ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
		ctx.stroke();
		ctx.setLineDash([]);

		const glowIntensity =
			settings.maxBallSpeed > settings.ballSpeed
				? (game.currentBallSpeed - settings.ballSpeed) /
					(settings.maxBallSpeed - settings.ballSpeed)
				: 0;

		const p1Height = powerUpsEnabled ? getEffectivePaddleHeight(powerUps, 1) : PADDLE_HEIGHT;
		const p2Height = powerUpsEnabled ? getEffectivePaddleHeight(powerUps, 2) : PADDLE_HEIGHT;

		// Left paddle
		const p1FlashAlpha = effects.paddle1Flash / 0.15;
		if (p1FlashAlpha > 0) {
			const r = Math.round(accentRgb.r + (paddleRgb.r - accentRgb.r) * (1 - p1FlashAlpha));
			const g = Math.round(accentRgb.g + (paddleRgb.g - accentRgb.g) * (1 - p1FlashAlpha));
			const b = Math.round(accentRgb.b + (paddleRgb.b - accentRgb.b) * (1 - p1FlashAlpha));
			ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
			ctx.shadowColor = theme.accent;
			ctx.shadowBlur = 12;
		} else {
			ctx.fillStyle = theme.paddle;
			ctx.shadowColor = theme.paddle;
			ctx.shadowBlur = glowIntensity * 14;
		}
		ctx.fillRect(PADDLE_OFFSET, game.paddle1Y, PADDLE_WIDTH, p1Height);
		ctx.shadowBlur = 0;

		// Right paddle
		const p2FlashAlpha = effects.paddle2Flash / 0.15;
		if (p2FlashAlpha > 0) {
			const r = Math.round(accentRgb.r + (paddleRgb.r - accentRgb.r) * (1 - p2FlashAlpha));
			const g = Math.round(accentRgb.g + (paddleRgb.g - accentRgb.g) * (1 - p2FlashAlpha));
			const b = Math.round(accentRgb.b + (paddleRgb.b - accentRgb.b) * (1 - p2FlashAlpha));
			ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
			ctx.shadowColor = theme.accent;
			ctx.shadowBlur = 12;
		} else {
			ctx.fillStyle = theme.paddle;
			ctx.shadowColor = theme.paddle;
			ctx.shadowBlur = glowIntensity * 14;
		}
		ctx.fillRect(CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH, game.paddle2Y, PADDLE_WIDTH, p2Height);
		ctx.shadowBlur = 0;

		// Ball trail
		if (game.phase !== 'menu') {
			drawTrail(ctx, effects, theme.accent);
		}

		// Ball (hidden during menu)
		if (game.phase !== 'menu') {
			ctx.fillStyle = theme.ball;
			ctx.shadowColor = theme.ball;
			ctx.shadowBlur = 15;
			ctx.beginPath();
			ctx.arc(game.ballX, game.ballY, BALL_RADIUS, 0, Math.PI * 2);
			ctx.fill();
			ctx.shadowBlur = 0;
		}

		// Particles
		drawParticles(ctx, effects, theme.accent);

		// Power-ups
		if (powerUpsEnabled && game.phase === 'playing') {
			drawSpawnedPowerUp(ctx, powerUps, theme);
			drawGhostBalls(ctx, powerUps, theme);
			drawActiveEffects(ctx, powerUps, theme);
		}

		// Score with scale animation
		ctx.font = "32px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';

		// Left score
		ctx.save();
		ctx.translate(CANVAS_WIDTH / 4, 50);
		ctx.scale(effects.scoreScaleLeft, effects.scoreScaleLeft);
		if (game.scoreFlash === 'left' && game.scoreFlashTimer > 0) {
			ctx.fillStyle = theme.accent;
			ctx.shadowColor = theme.accent;
			ctx.shadowBlur = 20;
		} else {
			ctx.fillStyle = theme.paddle;
		}
		ctx.fillText(String(game.score1), 0, 0);
		ctx.shadowBlur = 0;
		ctx.restore();

		// Right score
		ctx.save();
		ctx.translate((CANVAS_WIDTH / 4) * 3, 50);
		ctx.scale(effects.scoreScaleRight, effects.scoreScaleRight);
		if (game.scoreFlash === 'right' && game.scoreFlashTimer > 0) {
			ctx.fillStyle = theme.accent;
			ctx.shadowColor = theme.accent;
			ctx.shadowBlur = 20;
		} else {
			ctx.fillStyle = theme.paddle;
		}
		ctx.fillText(String(game.score2), 0, 0);
		ctx.shadowBlur = 0;
		ctx.restore();

		// Rally counter (only during active play, visible when rally > 2)
		if ((game.phase === 'playing' || game.phase === 'countdown') && game.ballReturns > 2) {
			ctx.font = "12px 'Inter', sans-serif";
			ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
			ctx.textAlign = 'center';
			ctx.fillText(`Rally: ${game.ballReturns}`, CANVAS_WIDTH / 2, 30);
		}

		// ESC hint (during active gameplay)
		if (game.phase === 'playing' || game.phase === 'countdown') {
			ctx.fillStyle = 'rgba(107, 114, 128, 0.4)';
			ctx.font = "10px 'Inter', sans-serif";
			ctx.textAlign = 'right';
			ctx.fillText(uiText.escQuit, CANVAS_WIDTH - 15, CANVAS_HEIGHT - 12);
			ctx.textAlign = 'center';  // Reset
		}

		// SPACE hint (during playing)
		if (game.phase === 'playing') {
			ctx.fillStyle = 'rgba(107, 114, 128, 0.4)';
			ctx.font = "10px 'Inter', sans-serif";
			ctx.textAlign = 'left';
			ctx.fillText('SPACE to pause', 15, CANVAS_HEIGHT - 12);
			ctx.textAlign = 'center';  // Reset
		}

		// Phase overlays
		if (game.phase === 'menu') drawMenuOverlay(ctx);
		else if (game.phase === 'countdown') drawCountdownOverlay(ctx);
		else if (game.phase === 'paused') drawPausedOverlay(ctx);
		else if (game.phase === 'gameover') drawGameOverOverlay(ctx);

		// Online-specific overlays (drawn on top)
		// if (onlinePaused) drawOnlinePausedOverlay(ctx);
		// if (onlineOpponentQuit) drawOpponentQuitOverlay(ctx);

		// Reset screen shake
		ctx.restore();
	}

	function overlayBg(opacity: number): string {
		const bg = hexToRgb(theme.background);
		return `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${opacity})`;
	}

	function drawMenuOverlay(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = overlayBg(0.85);
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Title
		ctx.fillStyle = theme.accent;
		ctx.shadowColor = theme.accent;
		ctx.shadowBlur = 30;
		ctx.font = "48px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText('PONG', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
		ctx.shadowBlur = 0;

		// Pulsing "PRESS SPACE"
		const pulse = 0.4 + Math.abs(Math.sin(Date.now() / 500)) * 0.6;
		ctx.globalAlpha = pulse;
		ctx.fillStyle = theme.paddle;
		ctx.font = "16px 'Press Start 2P', monospace";
		ctx.fillText(uiText.pressSpace, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
		ctx.globalAlpha = 1.0;

		// Controls reminder
		ctx.fillStyle = '#6b7280';
		ctx.font = "12px 'Inter', sans-serif";
		ctx.fillText(uiText.controlsReminder, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
	}

	function drawCountdownOverlay(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = overlayBg(0.6);
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		const fractional = game.countdownTimer % 1;
		const scale = game.countdownDisplay === "GO!" ? 1.2 : 1 + fractional * 0.3;
		const fontSize = Math.round(72 * scale);

		ctx.fillStyle = game.countdownDisplay === 'GO!' ? theme.accent : theme.paddle;
		ctx.shadowColor = game.countdownDisplay === 'GO!' ? theme.accent : theme.paddle;
		ctx.shadowBlur = 20;
		ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(game.countdownDisplay, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
		ctx.shadowBlur = 0;
		ctx.textBaseline = "alphabetic";
	}

	function drawPausedOverlay(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = overlayBg(0.75);
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		if (confirmingQuit) {
			ctx.fillStyle = theme.accent;
			ctx.font = "24px 'Press Start 2P', monospace";
			ctx.textAlign = 'center';
			ctx.fillText('QUIT GAME?', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

			ctx.fillStyle = '#9ca3af';
			ctx.font = "14px 'Inter', sans-serif";
			ctx.fillText('ESC to quit  ·  SPACE to resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
		} else {
			ctx.fillStyle = theme.paddle;
			ctx.font = "36px 'Press Start 2P', monospace";
			ctx.textAlign = 'center';
			ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

			const pulse = 0.4 + Math.abs(Math.sin(Date.now() / 500)) * 0.6;
			ctx.globalAlpha = pulse;
			ctx.fillStyle = theme.accent;
			ctx.font = "14px 'Press Start 2P', monospace";
			ctx.fillText('PRESS SPACE TO CONTINUE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
			ctx.globalAlpha = 1.0;

			ctx.fillStyle = '#6b7280';
			ctx.font = "16px 'Inter', sans-serif";
			ctx.fillText('ESC to quit', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 65);
		}
	}

	function drawGameOverOverlay(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = overlayBg(0.85);
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		ctx.fillStyle = theme.paddle;
		ctx.font = "36px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText(uiText.gameOver, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 100);

		// Winner
		ctx.fillStyle = theme.accent;
		ctx.shadowColor = theme.accent;
		ctx.shadowBlur = 20;
		ctx.font = "24px 'Press Start 2P', monospace";
		ctx.fillText(`${game.winner} Wins!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 45);
		ctx.shadowBlur = 0;

		// Score
		ctx.fillStyle = '#9ca3af';
		ctx.font = "18px 'Inter', sans-serif";
		ctx.fillText(`${game.score1}  —  ${game.score2}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

		// Stats
		const minutes = Math.floor(game.playTime / 60);
		const seconds = Math.floor(game.playTime % 60);
		const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
		ctx.fillStyle = '#6b7280';
		ctx.font = "13px 'Inter', sans-serif";
		ctx.fillText(
			`Longest Rally: ${game.longestRally}    ·    Top Speed: ${Math.round(game.maxBallSpeedReached)}px/s    ·    Time: ${timeStr}`,
			CANVAS_WIDTH / 2,
			CANVAS_HEIGHT / 2 + 40
		);

		const pulse = 0.4 + Math.abs(Math.sin(Date.now() / 500)) * 0.6;
		ctx.globalAlpha = pulse;
		ctx.fillStyle = theme.paddle;
		ctx.font = "14px 'Press Start 2P', monospace";
		ctx.fillText(uiText.pressSpace, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
		ctx.globalAlpha = 1.0;
	}

	// function drawOnlinePausedOverlay(ctx: CanvasRenderingContext2D) {
	// 	ctx.fillStyle = overlayBg(0.75);
	// 	ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

	// 	ctx.textAlign = 'center';

	// 	if (onlinePausedByMe) {
	// 		ctx.fillStyle = theme.paddle;
	// 		ctx.font = "36px 'Press Start 2P', monospace";
	// 		ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

	// 		const pulse = 0.4 + Math.abs(Math.sin(Date.now() / 500)) * 0.6;
	// 		ctx.globalAlpha = pulse;
	// 		ctx.fillStyle = theme.accent;
	// 		ctx.font = "14px 'Press Start 2P', monospace";
	// 		ctx.fillText('PRESS SPACE TO RESUME', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
	// 		ctx.globalAlpha = 1.0;

	// 		ctx.fillStyle = '#6b7280';
	// 		ctx.font = "16px 'Inter', sans-serif";
	// 		ctx.fillText('ESC to quit', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 65);
	// 	} else {
	// 		ctx.fillStyle = theme.accent;
	// 		ctx.font = "24px 'Press Start 2P', monospace";
	// 		ctx.fillText('OPPONENT PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

	// 		const pulse = 0.4 + Math.abs(Math.sin(Date.now() / 500)) * 0.6;
	// 		ctx.globalAlpha = pulse;
	// 		ctx.fillStyle = '#9ca3af';
	// 		ctx.font = "14px 'Inter', sans-serif";
	// 		ctx.fillText('Waiting for opponent to resume...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);
	// 		ctx.globalAlpha = 1.0;

	// 		ctx.fillStyle = '#6b7280';
	// 		ctx.font = "16px 'Inter', sans-serif";
	// 		ctx.fillText('ESC to quit', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
	// 	}
	// }

	function drawOpponentQuitOverlay(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = overlayBg(0.85);
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		ctx.textAlign = 'center';

		ctx.fillStyle = theme.accent;
		ctx.font = "24px 'Press Start 2P', monospace";
		ctx.fillText('OPPONENT LEFT', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

		// ctx.fillStyle = '#9ca3af';
		// ctx.font = "16px 'Inter', sans-serif";
		// ctx.fillText(`${onlineOpponentQuitName} doesn't want to play`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15);

		ctx.fillStyle = '#6b7280';
		ctx.font = "14px 'Inter', sans-serif";
		ctx.fillText('Returning to menu...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
	}
</script>

<!-- Keyboard listeners -->
<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<!-- Canvas -->
<div class="canvas-wrapper">
	<canvas
		bind:this={canvas}
		width={CANVAS_WIDTH}
		height={CANVAS_HEIGHT}
	></canvas>
	<button
		class="mute-btn"
		onclick={toggleMute}
		aria-label={soundMuted ? 'Unmute sound' : 'Mute sound'}
	>
		{#if soundMuted}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M11 5L6 9H2v6h4l5 4V5z" />
				<line x1="23" y1="9" x2="17" y2="15" />
				<line x1="17" y1="9" x2="23" y2="15" />
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M11 5L6 9H2v6h4l5 4V5z" />
				<path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
				<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
			</svg>
		{/if}
	</button>
</div>

<style>
	.canvas-wrapper {
		position: relative;
		border-radius: 0.75rem;
		overflow: hidden;
		border: 1px solid rgba(255, 107, 157, 0.2);
		box-shadow: 0 0 30px rgba(255, 107, 157, 0.1);
	}

	canvas {
		display: block;
		max-width: 100%;
		height: auto;
	}

	.mute-btn {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 28px;
		height: 28px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 6px;
		color: #9ca3af;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		transition: all 0.15s;
		z-index: 10;
	}

	.mute-btn:hover {
		background: rgba(255, 255, 255, 0.12);
		color: #d1d5db;
	}

	.mute-btn svg {
		width: 16px;
		height: 16px;
	}
</style>