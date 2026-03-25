<script lang="ts">
	import { onMount } from 'svelte';
	import { getSocket } from '$lib/stores/socket.svelte';
	import {
	CANVAS_WIDTH,
	CANVAS_HEIGHT,
	PADDLE_WIDTH,
	PADDLE_HEIGHT,
	PADDLE_OFFSET,
	BALL_RADIUS,
	} from './gameEngine';
	import type { GameStateSnapshot } from '$lib/types/game';
	import { getTheme } from './themes';
	import { getBallSkin } from './ballSkins';
	import { drawThemeBackground, drawCourtLine, drawPaddles } from './themeRenderer';
	import { drawBall, drawBallTrail } from './ballSkinRenderer';
	import { EffectsEngine, DEFAULT_EFFECTS_CUSTOM, type EffectsConfig } from './effectsEngine';
	import { getSoundEngine } from './soundEngine';
	import MuteButton from './MuteButton.svelte';

	type Props = {
		roomId: string;
		side: 'left' | 'right';  // Which paddle this player controls
		player1: { userId: number; username: string };
		player2: { userId: number; username: string };
		onGameOver?: (result: any) => void;
		themeId?: string;
		ballSkinId?: string;
		effectsConfig?: EffectsConfig;
	};

	let { roomId, side, player1, player2, onGameOver, themeId, ballSkinId, effectsConfig }: Props = $props();

	const theme = $derived(getTheme(themeId ?? 'classic'));
	const ballSkin = $derived(getBallSkin(ballSkinId ?? 'default'));
	const effects = new EffectsEngine();
	let gameTime = 0;
	let prevScore1 = 0;
	let prevScore2 = 0;
	let prevBallVX = 0;
	let lastRenderTime = 0;

	$effect(() => {
		effects.setConfig(effectsConfig ?? { preset: 'arcade', custom: DEFAULT_EFFECTS_CUSTOM });
	});

	let canvas: HTMLCanvasElement;
	let latestState: GameStateSnapshot | null = $state(null);
	let disconnectedPlayer: number | null = $state(null);

	// ── Keyboard Input ──────────────────────────────────────────
	// Track individual keys to handle simultaneous presses correctly.
	// Example: holding W then pressing S → stop, then releasing S → up again.
	const keysDown = new Set<string>();
	let lastSentDirection: 'up' | 'down' | 'stop' = 'stop';

	function computeDirection(): 'up' | 'down' | 'stop' {
		const upHeld = keysDown.has('w') || keysDown.has('arrowup');
		const downHeld = keysDown.has('s') || keysDown.has('arrowdown');
		if (upHeld && !downHeld) return 'up';
		if (downHeld && !upHeld) return 'down';
		return 'stop';
	}

	function sendDirection() {
		const dir = computeDirection();
		if (dir !== lastSentDirection) {
			lastSentDirection = dir;
			const socket = getSocket();
			socket?.emit('game:paddle-move', { direction: dir });
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		// Don't capture game keys when typing in chat input
		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA') return;

		const key = e.key.toLowerCase();
		if (['w', 's', 'arrowup', 'arrowdown'].includes(key)) {
			e.preventDefault();
			keysDown.add(key);
			sendDirection();
		}
	}

	function handleKeyUp(e: KeyboardEvent) {
		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA') return;

		const key = e.key.toLowerCase();
		if (keysDown.has(key)) {
			keysDown.delete(key);
			sendDirection();
		}
	}

	// ── Socket Listeners + Render Loop ──────────────────────────
	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const socket = getSocket();
		if (!socket) return;

		// NOTE: game:join-room is emitted by the parent page component,
		// not here, to avoid double-emission. This component only listens.

		// Listen for state updates from the server (60 per second)
		socket.on('game:state', (state: GameStateSnapshot) => {
			latestState = state;
		});

		socket.on('game:over', (result: any) => {
			const won = result.winnerId === (side === 'left' ? player1.userId : player2.userId);
			getSoundEngine().gameOver(won);
			onGameOver?.(result);
		});

		socket.on('game:forfeit', (result: any) => {
			const won = result.winnerId === (side === 'left' ? player1.userId : player2.userId);
			getSoundEngine().gameOver(won);
			onGameOver?.(result);
		});

		socket.on('game:player-disconnected', (data: { userId: number; timeout: number }) => {
			disconnectedPlayer = data.userId;
		});

		socket.on('game:player-reconnected', () => {
			disconnectedPlayer = null;
		});

		// Render loop — just draws the latest state, NO physics
		let animFrame: number;
		function renderLoop() {
			const now = performance.now();
			const dt = lastRenderTime ? Math.min((now - lastRenderTime) / 1000, 0.05) : 0;
			lastRenderTime = now;
			gameTime += dt;

			if (latestState) {
				// Effects updates
				effects.update(dt);
				if (latestState.phase === 'playing' || latestState.phase === 'countdown') {
					effects.addTrailPoint(latestState.ballX, latestState.ballY);
					effects.maybeSpawnSpeedLine(latestState.ballVX, CANVAS_WIDTH, CANVAS_HEIGHT);
				}

				// Detect paddle hit
				if (latestState.phase === 'playing' && Math.sign(latestState.ballVX) !== Math.sign(prevBallVX) && prevBallVX !== 0) {
					const hitSide: 'left' | 'right' = latestState.ballVX > 0 ? 'left' : 'right';
					const hitX = hitSide === 'left' ? PADDLE_OFFSET + PADDLE_WIDTH : CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
					effects.onPaddleHit(hitX, latestState.ballY, [theme.colors.ball, theme.colors.paddle1, theme.colors.paddle2], hitSide);
					getSoundEngine().paddleHit(Math.abs(latestState.ballVX));
				}

				// Detect score change
				if (latestState.score1 !== prevScore1 || latestState.score2 !== prevScore2) {
					const scoredLeft = latestState.score1 !== prevScore1;
					const scoreX = scoredLeft ? CANVAS_WIDTH * 0.25 : CANVAS_WIDTH * 0.75;
					effects.onScore(scoreX, CANVAS_HEIGHT / 2, [theme.colors.ball, '#ffffff']);
					getSoundEngine().score(side === 'left' ? scoredLeft : !scoredLeft);
					prevScore1 = latestState.score1;
					prevScore2 = latestState.score2;
				}

				prevBallVX = latestState.ballVX;
				draw(ctx!, latestState);
			}
			animFrame = requestAnimationFrame(renderLoop);
		}
		animFrame = requestAnimationFrame(renderLoop);

		// Cleanup when component is destroyed
		return () => {
			cancelAnimationFrame(animFrame);
			socket.off('game:state');
			socket.off('game:over');
			socket.off('game:forfeit');
			socket.off('game:player-disconnected');
			socket.off('game:player-reconnected');
		};
	});

	// ── Drawing ─────────────────────────────────────────────────

	function draw(ctx: CanvasRenderingContext2D, state: GameStateSnapshot) {
		ctx.save();
		ctx.translate(effects.shakeX, effects.shakeY);

		// Themed background
		drawThemeBackground(ctx, theme, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Score flash
		if (state.scoreFlash) {
			const flashOpacity = Math.max(0, state.scoreFlashTimer / 0.5 * 0.15);
			ctx.fillStyle = `rgba(255, 107, 157, ${flashOpacity})`;
			if (state.scoreFlash === 'left') {
				ctx.fillRect(0, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT);
			} else {
				ctx.fillRect(CANVAS_WIDTH / 2, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT);
			}
		}

		// Court line
		drawCourtLine(ctx, theme, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Speed lines
		effects.drawSpeedLines(ctx, Math.sign(state.ballVX));

		// Ball trail
		if (state.phase !== 'menu') {
			drawBallTrail(ctx, ballSkin, theme, effects.trail, gameTime);
		}

		// Particles
		effects.drawParticles(ctx);

		// Chromatic aberration
		if (state.phase !== 'menu') {
			effects.drawAberration(ctx, state.ballX, state.ballY, BALL_RADIUS);
		}

		// Paddles (themed, no glow intensity from server — use 0.5 default)
		drawPaddles(ctx, theme, state.paddle1Y, state.paddle2Y, 0.5, effects.paddleFlashLeft, effects.paddleFlashRight);

		// Ball (skinned)
		if (state.phase !== 'menu') {
			drawBall(ctx, ballSkin, theme, state.ballX, state.ballY, gameTime, state.ballSpin, state.ballRotation);
		}

		// Scores
		ctx.font = "32px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';

		if (state.scoreFlash === 'left' && state.scoreFlashTimer > 0) {
			ctx.fillStyle = theme.colors.ball;
			ctx.shadowColor = theme.colors.ball;
			ctx.shadowBlur = 20;
		} else {
			ctx.fillStyle = '#ffffff';
		}
		ctx.fillText(String(state.score1), CANVAS_WIDTH / 4, 50);
		ctx.shadowBlur = 0;

		if (state.scoreFlash === 'right' && state.scoreFlashTimer > 0) {
			ctx.fillStyle = theme.colors.ball;
			ctx.shadowColor = theme.colors.ball;
			ctx.shadowBlur = 20;
		} else {
			ctx.fillStyle = '#ffffff';
		}
		ctx.fillText(String(state.score2), (CANVAS_WIDTH / 4) * 3, 50);
		ctx.shadowBlur = 0;

		// Player names
		ctx.fillStyle = '#6b7280';
		ctx.font = "12px 'Inter', sans-serif";
		ctx.textAlign = 'left';
		ctx.fillText(player1.username, PADDLE_OFFSET, CANVAS_HEIGHT - 12);
		ctx.textAlign = 'right';
		ctx.fillText(player2.username, CANVAS_WIDTH - PADDLE_OFFSET, CANVAS_HEIGHT - 12);
		ctx.textAlign = 'center';

		ctx.restore();

		// Phase overlays (outside shake)
		if (state.phase === 'countdown') {
			drawCountdown(ctx, state);
		} else if (state.phase === 'gameover') {
			drawGameOver(ctx, state);
		}

		// Disconnection overlay
		if (disconnectedPlayer !== null) {
			ctx.fillStyle = 'rgba(10, 10, 26, 0.7)';
			ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
			ctx.fillStyle = '#ff6b9d';
			ctx.font = "18px 'Press Start 2P', monospace";
			ctx.fillText('Player disconnected', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
			ctx.fillStyle = '#9ca3af';
			ctx.font = "14px 'Inter', sans-serif";
			ctx.fillText('Waiting for reconnection...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
		}
	}

	function drawCountdown(ctx: CanvasRenderingContext2D, state: GameStateSnapshot) {
	ctx.fillStyle = 'rgba(10, 10, 26, 0.6)';
	ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

	ctx.fillStyle = state.countdownDisplay === 'GO!' ? '#ff6b9d' : '#ffffff';
	ctx.shadowColor = state.countdownDisplay === 'GO!' ? '#ff6b9d' : '#ffffff';
	ctx.shadowBlur = 20;
	ctx.font = "72px 'Press Start 2P', monospace";
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(state.countdownDisplay, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
	ctx.shadowBlur = 0;
	ctx.textBaseline = 'alphabetic';
	}

	function drawGameOver(ctx: CanvasRenderingContext2D, state: GameStateSnapshot) {
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
	ctx.fillText(`${state.winner} Wins!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 15);
	ctx.shadowBlur = 0;

	ctx.fillStyle = '#9ca3af';
	ctx.font = "18px 'Inter', sans-serif";
	ctx.fillText(`${state.score1}  —  ${state.score2}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
	}
</script>

<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<div class="canvas-wrapper" style="position:relative;">
	<canvas bind:this={canvas} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}></canvas>
	<MuteButton />
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
