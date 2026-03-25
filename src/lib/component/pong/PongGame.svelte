<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		type GameState,
		type GameSettings,
		type InputState,
		createGameState,
		update,
		startCountdown,
		startPlaying,
		returnToMenu,
		pauseGame,
		resumeGame,
		computeComputerInput,
		CANVAS_WIDTH,
		CANVAS_HEIGHT,
		PADDLE_WIDTH,
		PADDLE_HEIGHT,
		PADDLE_OFFSET,
		BALL_RADIUS,
	} from './gameEngine';
	import { getTheme } from './themes';
	import { getBallSkin } from './ballSkins';
	import { drawThemeBackground, drawCourtLine, drawPaddles } from './themeRenderer';
	import { drawBall, drawBallTrail } from './ballSkinRenderer';
	import { EffectsEngine, DEFAULT_EFFECTS_CUSTOM, type EffectsConfig } from './effectsEngine';
	import { getSoundEngine } from './soundEngine';
	import MuteButton from './MuteButton.svelte';

	type Props = {
		settings: GameSettings;
		onGameOver?: (result: {
			score1: number;
			score2: number;
			winner: 'player1' | 'player2';
			durationSeconds: number;
			ballReturns: number;
			maxDeficit: number;
			reachedDeuce: boolean;
		}) => void;
		themeId?: string;
		ballSkinId?: string;
		effectsConfig?: EffectsConfig;
		soundMuted?: boolean;
		onMuteChange?: (muted: boolean) => void;
		canStart?: boolean;
	};

	let { settings, onGameOver, themeId, ballSkinId, effectsConfig, soundMuted = false, onMuteChange, canStart = true }: Props = $props();
	let localMuted = $state(false);

	// Sync from parent
	$effect(() => { localMuted = soundMuted ?? false; });
	let game = $state<GameState>(createGameState());

	const theme = $derived(getTheme(themeId ?? 'classic'));
	const ballSkin = $derived(getBallSkin(ballSkinId ?? 'default'));
	const effects = new EffectsEngine();
	let gameTime = 0;

	// Track previous state for detecting events
	let prevBallVX = 0;
	let prevScore1 = 0;
	let prevScore2 = 0;

	$effect(() => {
		effects.setConfig(effectsConfig ?? { preset: 'arcade', custom: DEFAULT_EFFECTS_CUSTOM });
	});

	onDestroy(() => getSoundEngine().destroy());

	// Expose game state for the parent to read (phase, scores, etc.)
	export function getGameState(): GameState {
		return game;
	}

	// Track what phase we paused from and whether ESC triggered it
	let pausedFrom = $state<'playing' | 'countdown'>('playing');
	let escPaused = $state(false);

	export function pause() {
		if (game.phase === 'playing' || game.phase === 'countdown') {
			pausedFrom = game.phase as 'playing' | 'countdown';
			escPaused = false;
			pauseGame(game);
		}
	}

	export function resume() {
		if (game.phase === 'paused') {
			game.phase = pausedFrom;
			escPaused = false;
		}
	}

	let canvas: HTMLCanvasElement;
	let lastTime = 0;

	const keysDown = new Set<string>();

	function getInput(): InputState {
		const humanInput: InputState = {
			paddle1Up:   keysDown.has('w'),
			paddle1Down: keysDown.has('s'),
			paddle2Up:   keysDown.has('arrowup'),
			paddle2Down: keysDown.has('arrowdown'),
		};

		// In computer mode, override paddle 2 with AI logic
		if (settings.gameMode === 'computer') {
			const aiInput = computeComputerInput(game);
			humanInput.paddle2Up = aiInput.paddle2Up;
			humanInput.paddle2Down = aiInput.paddle2Down;
		}

		return humanInput;
	}

	function handleKeyDown(e: KeyboardEvent) {
		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA') return;

		const key = e.key.toLowerCase();
		keysDown.add(key);

		if (['arrowup', 'arrowdown'].includes(key)) {
			e.preventDefault();
		}

		// ESC behavior:
		// During playing/countdown → pause (with ESC flag for double-tap quit)
		// During paused → quit to menu (second ESC confirms quit)
		if (key === 'escape') {
			if (game.phase === 'playing' || game.phase === 'countdown') {
				pausedFrom = game.phase as 'playing' | 'countdown';
				escPaused = true;
				pauseGame(game);
			} else if (game.phase === 'paused') {
				// Second ESC → quit
				escPaused = false;
				returnToMenu(game);
				effects.reset();
			}
		}

		// SPACE behavior:
		// During menu → start game
		// During playing/countdown → pause
		// During paused → resume
		// During gameover → back to menu
		if (key === ' ' || key === 'space') {
			e.preventDefault();
			getSoundEngine().init();
			if (game.phase === 'menu' && canStart) {
				startCountdown(game, settings);
			} else if (game.phase === 'playing' || game.phase === 'countdown') {
				pausedFrom = game.phase as 'playing' | 'countdown';
				escPaused = false;
				pauseGame(game);
			} else if (game.phase === 'paused') {
				game.phase = pausedFrom;
				escPaused = false;
			} else if (game.phase === 'gameover') {
				returnToMenu(game);
				effects.reset();
			}
		}
	}

	function handleKeyUp(e: KeyboardEvent) {
		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA') return;

		keysDown.delete(e.key.toLowerCase());
	}

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		requestAnimationFrame((timestamp) => {
			lastTime = timestamp;
			gameLoop(ctx, timestamp);
		});
	});

	function gameLoop(ctx: CanvasRenderingContext2D, timestamp: number) {
		const dt = (timestamp - lastTime) / 1000;
		lastTime = timestamp;
		const safeDt = Math.min(dt, 0.05);

		// Get current input
		const input = getInput();

		// Track previous phase to detect transitions
		const prevPhase = game.phase;

		// Update game state via engine
		update(game, safeDt, input, settings);

		gameTime += safeDt;

		// Effects engine update
		effects.update(safeDt);
		if (game.phase === 'playing' || game.phase === 'countdown') {
			effects.addTrailPoint(game.ballX, game.ballY);
			effects.maybeSpawnSpeedLine(game.ballVX, CANVAS_WIDTH, CANVAS_HEIGHT);
		}

		// Detect paddle hit (ball direction changed)
		if (game.phase === 'playing' && Math.sign(game.ballVX) !== Math.sign(prevBallVX) && prevBallVX !== 0) {
			const hitSide: 'left' | 'right' = game.ballVX > 0 ? 'left' : 'right';
			const hitX = hitSide === 'left' ? PADDLE_OFFSET + PADDLE_WIDTH : CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
			effects.onPaddleHit(hitX, game.ballY, [theme.colors.ball, theme.colors.paddle1, theme.colors.paddle2], hitSide);
			getSoundEngine().paddleHit(Math.abs(game.ballVX));
		}

		// Detect score
		if (game.score1 !== prevScore1 || game.score2 !== prevScore2) {
			const scoredLeft = game.score1 !== prevScore1;
			const scoreX = scoredLeft ? CANVAS_WIDTH * 0.25 : CANVAS_WIDTH * 0.75;
			effects.onScore(scoreX, CANVAS_HEIGHT / 2, [theme.colors.ball, '#ffffff']);
			getSoundEngine().score(scoredLeft);
			prevScore1 = game.score1;
			prevScore2 = game.score2;
		}

		prevBallVX = game.ballVX;

		// Check if countdown just finished
		if (game.phase === 'countdown' && game.countdownTimer <= 0) {
			startPlaying(game, settings);
			getSoundEngine().countdown(0);
		}

		// Detect game-over transition → fire callback to save match
		// We check prevPhase to ensure this fires ONCE (not every frame)
		if (game.phase === 'gameover' && prevPhase === 'playing') {
			getSoundEngine().gameOver(game.score1 > game.score2);
			onGameOver?.({
				score1: game.score1,
				score2: game.score2,
				winner: game.score1 > game.score2 ? 'player1' : 'player2',
				durationSeconds: Math.round(game.playTime),
				ballReturns: game.ballReturns,
				maxDeficit: game.maxDeficit,
				reachedDeuce: game.reachedDeuce,
			});
		}

		// Draw
		draw(ctx);

		requestAnimationFrame((t) => gameLoop(ctx, t));
	}
	function draw(ctx: CanvasRenderingContext2D) {
		const fontSize = 24;

		ctx.save();
		ctx.translate(effects.shakeX, effects.shakeY);

		// Background (themed)
		drawThemeBackground(ctx, theme, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Score flash (use theme ball color)
		if (game.scoreFlash) {
			const flashOpacity = Math.max(0, game.scoreFlashTimer / 0.5 * 0.15);
			ctx.fillStyle = `rgba(255, 107, 157, ${flashOpacity})`;
			if (game.scoreFlash === 'left') {
				ctx.fillRect(0, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT);
			} else {
				ctx.fillRect(CANVAS_WIDTH / 2, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT);
			}
		}

		// Court line (themed)
		drawCourtLine(ctx, theme, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Speed lines
		effects.drawSpeedLines(ctx, Math.sign(game.ballVX));

		// Ball trail
		if (game.phase !== 'menu') {
			drawBallTrail(ctx, ballSkin, theme, effects.trail, gameTime);
		}

		// Particles
		effects.drawParticles(ctx);

		// Chromatic aberration
		if (game.phase !== 'menu') {
			effects.drawAberration(ctx, game.ballX, game.ballY, BALL_RADIUS);
		}

		// Paddles (themed)
		const glowIntensity = settings.maxBallSpeed > settings.ballSpeed
			? (game.currentBallSpeed - settings.ballSpeed) / (settings.maxBallSpeed - settings.ballSpeed)
			: 0;
		drawPaddles(ctx, theme, game.paddle1Y, game.paddle2Y, glowIntensity, effects.paddleFlashLeft, effects.paddleFlashRight);

		// Ball (skinned)
		if (game.phase !== 'menu') {
			drawBall(ctx, ballSkin, theme, game.ballX, game.ballY, gameTime, game.ballSpin, game.ballRotation);
		}

		// Score text
		ctx.font = "32px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';

		if (game.scoreFlash === 'left' && game.scoreFlashTimer > 0) {
			ctx.fillStyle = theme.colors.ball;
			ctx.shadowColor = theme.colors.ball;
			ctx.shadowBlur = 20;
		} else {
			ctx.fillStyle = '#ffffff';
		}
		ctx.fillText(String(game.score1), CANVAS_WIDTH / 4, 50);
		ctx.shadowBlur = 0;

		if (game.scoreFlash === 'right' && game.scoreFlashTimer > 0) {
			ctx.fillStyle = theme.colors.ball;
			ctx.shadowColor = theme.colors.ball;
			ctx.shadowBlur = 20;
		} else {
			ctx.fillStyle = '#ffffff';
		}
		ctx.fillText(String(game.score2), (CANVAS_WIDTH / 4) * 3, 50);
		ctx.shadowBlur = 0;

		// Pause/quit hint
		if (game.phase === 'playing' || game.phase === 'countdown') {
			ctx.fillStyle = 'rgba(107, 114, 128, 0.4)';
			ctx.font = "10px 'Inter', sans-serif";
			ctx.textAlign = 'right';
			ctx.fillText('SPACE pause · ESC quit', CANVAS_WIDTH - 15, CANVAS_HEIGHT - 12);
			ctx.textAlign = 'center';
		}

		ctx.restore();

		// Phase overlays (drawn OUTSIDE shake transform)
		if (game.phase === 'menu') drawMenuOverlay(ctx);
		else if (game.phase === 'countdown') drawCountdownOverlay(ctx);
		else if (game.phase === 'gameover') drawGameOverOverlay(ctx);

		if (game.phase === 'paused') {
			ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
			ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
			ctx.fillStyle = '#ff6b9d';
			ctx.font = `bold ${fontSize * 1.5}px 'Press Start 2P', monospace`;
			ctx.textAlign = 'center';
			ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
			ctx.font = `${fontSize * 0.7}px 'Press Start 2P', monospace`;
			ctx.fillStyle = '#9ca3af';
			if (escPaused) {
				ctx.fillText('ESC again to quit', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);
				ctx.fillText('SPACE to resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
			} else {
				ctx.fillText('SPACE to resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);
				ctx.fillText('ESC to quit', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
			}
		}
	}

	function drawMenuOverlay(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Title
		ctx.fillStyle = '#ff6b9d';
		ctx.shadowColor = '#ff6b9d';
		ctx.shadowBlur = 30;
		ctx.font = "48px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText('PONG', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
		ctx.shadowBlur = 0;

		// Pulsing "PRESS SPACE" (only when game can start)
		if (canStart) {
			const pulse = 0.4 + Math.abs(Math.sin(Date.now() / 500)) * 0.6;
			ctx.globalAlpha = pulse;
			ctx.fillStyle = '#ffffff';
			ctx.font = "16px 'Press Start 2P', monospace";
			ctx.fillText('PRESS SPACE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
			ctx.globalAlpha = 1.0;
		}

		// Controls reminder
		ctx.fillStyle = '#6b7280';
		ctx.font = "12px 'Inter', sans-serif";
		ctx.fillText('Player 1: W / S          Player 2: ↑ / ↓', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
	}

	function drawCountdownOverlay(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = 'rgba(10, 10, 26, 0.6)';
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		const fractional = game.countdownTimer % 1;
		const scale = game.countdownDisplay === 'GO!' ? 1.2 : 1 + fractional * 0.3;
		const fontSize = Math.round(72 * scale);

		ctx.fillStyle = game.countdownDisplay === 'GO!' ? '#ff6b9d' : '#ffffff';
		ctx.shadowColor = game.countdownDisplay === 'GO!' ? '#ff6b9d' : '#ffffff';
		ctx.shadowBlur = 20;
		ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(game.countdownDisplay, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
		ctx.shadowBlur = 0;
		ctx.textBaseline = 'alphabetic';
	}

	function drawGameOverOverlay(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		ctx.fillStyle = '#ffffff';
		ctx.font = "36px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 70);

		ctx.fillStyle = '#ff6b9d';
		ctx.shadowColor = '#ff6b9d';
		ctx.shadowBlur = 20;
		ctx.font = "24px 'Press Start 2P', monospace";
		ctx.fillText(`${game.winner} Wins!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 15);
		ctx.shadowBlur = 0;

		ctx.fillStyle = '#9ca3af';
		ctx.font = "18px 'Inter', sans-serif";
		ctx.fillText(`${game.score1}  —  ${game.score2}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);

		const pulse = 0.4 + Math.abs(Math.sin(Date.now() / 500)) * 0.6;
		ctx.globalAlpha = pulse;
		ctx.fillStyle = '#ffffff';
		ctx.font = "14px 'Press Start 2P', monospace";
		ctx.fillText('PRESS SPACE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
		ctx.globalAlpha = 1.0;
	}
</script>

<!-- Keyboard listeners -->
<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<!-- Canvas -->
<div class="canvas-wrapper" style="position:relative;">
	<canvas bind:this={canvas} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}></canvas>
	<MuteButton bind:muted={localMuted} onToggle={(m) => onMuteChange?.(m)} />
</div>

<style>
	.canvas-wrapper {
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
</style>