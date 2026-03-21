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
	import { MetricsCollector } from './debugMetrics';
	import { drawDebugHud } from './debugHud';

	type Props = {
		roomId: string;
		side: 'left' | 'right';  // Which paddle this player controls
		player1: { userId: number; username: string };
		player2: { userId: number; username: string };
		onGameOver?: (result: any) => void;
	};

	let { roomId, side, player1, player2, onGameOver }: Props = $props();

	let canvas: HTMLCanvasElement;
	let latestState: GameStateSnapshot | null = $state(null);
	let disconnectedPlayer: number | null = $state(null);
	const debugEnabled = true;
	const metrics = debugEnabled ? new MetricsCollector() : null;

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
		const key = e.key.toLowerCase();
		if (['w', 's', 'arrowup', 'arrowdown'].includes(key)) {
			e.preventDefault();
			keysDown.add(key);
			sendDirection();
		}
	}

	function handleKeyUp(e: KeyboardEvent) {
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
			if (metrics) metrics.recordSnapshot(state.timestamp);
		});

		socket.on('game:over', (result: any) => {
			metrics?.downloadRecording();
			onGameOver?.(result);
		});

		socket.on('game:forfeit', (result: any) => {
			metrics?.downloadRecording();
			onGameOver?.(result);
		});

		socket.on('game:player-disconnected', (data: { userId: number; timeout: number }) => {
			disconnectedPlayer = data.userId;
		});

		socket.on('game:player-reconnected', () => {
			disconnectedPlayer = null;
		});

		if (debugEnabled) {
			socket.on('game:pong', (data: { clientTimestamp: number }) => {
				metrics!.recordPong(data.clientTimestamp);
			});
		}

		// Render loop — just draws the latest state, NO physics
		let animFrame: number;
		function renderLoop() {
			if (debugEnabled) {
				const now = performance.now();
				metrics!.recordFrame(now);

				if (latestState) {
					draw(ctx!, latestState);
					drawDebugHud(ctx!, metrics!.getMetrics());
				}

				if (metrics!.shouldPing(now)) {
					socket.emit('game:ping', { timestamp: Date.now() });
				}
			} else if (latestState) {
				draw(ctx!, latestState);
			}

			animFrame = requestAnimationFrame(renderLoop);
		}
		animFrame = requestAnimationFrame(renderLoop);

		// Cleanup when component is destroyed
		return () => {
			cancelAnimationFrame(animFrame);
			if (metrics) metrics.reset();
			socket.off('game:state');
			socket.off('game:over');
			socket.off('game:forfeit');
			socket.off('game:player-disconnected');
			socket.off('game:player-reconnected');
			if (debugEnabled) socket.off('game:pong');
		};
	});

	// ── Drawing ─────────────────────────────────────────────────
	// Reuses the same visual style as PongGame.svelte

	function draw(ctx: CanvasRenderingContext2D, state: GameStateSnapshot) {
	// Background
	ctx.fillStyle = '#0a0a1a';
	ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

	// Score flash effect
	if (state.scoreFlash) {
		const flashOpacity = Math.max(0, state.scoreFlashTimer / 0.5 * 0.15);
		ctx.fillStyle = `rgba(255, 107, 157, ${flashOpacity})`;
		if (state.scoreFlash === 'left') {
		ctx.fillRect(0, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT);
		} else {
		ctx.fillRect(CANVAS_WIDTH / 2, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT);
		}
	}

	// Center dashed line
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
	ctx.lineWidth = 2;
	ctx.setLineDash([15, 10]);
	ctx.beginPath();
	ctx.moveTo(CANVAS_WIDTH / 2, 0);
	ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
	ctx.stroke();
	ctx.setLineDash([]);

	// Paddles
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(PADDLE_OFFSET, state.paddle1Y, PADDLE_WIDTH, PADDLE_HEIGHT);
	ctx.fillRect(
		CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH,
		state.paddle2Y,
		PADDLE_WIDTH,
		PADDLE_HEIGHT,
	);

	// Ball (hidden during menu phase)
	if (state.phase !== 'menu') {
		ctx.save();
		ctx.translate(state.ballX, state.ballY);
		ctx.rotate(state.ballRotation);
		ctx.fillStyle = '#ff6b9d';
		ctx.shadowColor = '#ff6b9d';
		ctx.shadowBlur = 15;
		ctx.beginPath();
		ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
		ctx.fill();
		ctx.shadowBlur = 0;

		// Spin indicator line
		if (Math.abs(state.ballSpin) > 0.01) {
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(-BALL_RADIUS * 0.6, 0);
		ctx.lineTo(BALL_RADIUS * 0.6, 0);
		ctx.stroke();
		}
		ctx.restore();
	}

	// Scores
	ctx.font = "32px 'Press Start 2P', monospace";
	ctx.textAlign = 'center';

	// Left score (with flash effect)
	if (state.scoreFlash === 'left' && state.scoreFlashTimer > 0) {
		ctx.fillStyle = '#ff6b9d';
		ctx.shadowColor = '#ff6b9d';
		ctx.shadowBlur = 20;
	} else {
		ctx.fillStyle = '#ffffff';
	}
	ctx.fillText(String(state.score1), CANVAS_WIDTH / 4, 50);
	ctx.shadowBlur = 0;

	// Right score (with flash effect)
	if (state.scoreFlash === 'right' && state.scoreFlashTimer > 0) {
		ctx.fillStyle = '#ff6b9d';
		ctx.shadowColor = '#ff6b9d';
		ctx.shadowBlur = 20;
	} else {
		ctx.fillStyle = '#ffffff';
	}
	ctx.fillText(String(state.score2), (CANVAS_WIDTH / 4) * 3, 50);
	ctx.shadowBlur = 0;

	// Player names at bottom
	ctx.fillStyle = '#6b7280';
	ctx.font = "12px 'Inter', sans-serif";
	ctx.textAlign = 'left';
	ctx.fillText(player1.username, PADDLE_OFFSET, CANVAS_HEIGHT - 12);
	ctx.textAlign = 'right';
	ctx.fillText(player2.username, CANVAS_WIDTH - PADDLE_OFFSET, CANVAS_HEIGHT - 12);
	ctx.textAlign = 'center';

	// Phase overlays
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

<div class="canvas-wrapper">
	<canvas
	bind:this={canvas}
	width={CANVAS_WIDTH}
	height={CANVAS_HEIGHT}
	></canvas>
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
