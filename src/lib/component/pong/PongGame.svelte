<script lang="ts">
	import { onMount } from "svelte";
	import { _ } from "svelte-i18n";
	import {
		type GameState,
		type GameSettings,
		type InputState,
		createGameState,
		update,
		startCountdown,
		startPlaying,
		returnToMenu,
		computeComputerInput,
		CANVAS_WIDTH,
		CANVAS_HEIGHT,
		PADDLE_WIDTH,
		PADDLE_HEIGHT,
		PADDLE_OFFSET,
		BALL_RADIUS,
	} from "./gameEngine";

	type Props = {
		settings: GameSettings;
		onGameOver?: (result: {
			score1: number;
			score2: number;
			winner: "player1" | "player2";
			durationSeconds: number;
			ballReturns: number;
			maxDeficit: number;
			reachedDeuce: boolean;
		}) => void;
	};

	let { settings, onGameOver }: Props = $props();
	let game = $state<GameState>(createGameState());

	export function getGameState(): GameState {
		return game;
	}

	let canvas: HTMLCanvasElement;
	let lastTime = 0;

	const keysDown = new Set<string>();

	const uiText = $derived({
		escQuit: $_("canvas_game.esc_quit"),
		title: $_("canvas_game.title"),
		pressSpace: $_("canvas_game.press_space"),
		controlsReminder: $_("canvas_game.controls_reminder"),
		gameOver: $_("canvas_game.game_over"),
		winsSuffix: $_("canvas_game.wins_suffix"),
		player1: $_("canvas_game.players.player1"),
		player2: $_("canvas_game.players.player2"),
	});

	function getInput(): InputState {
		const humanInput: InputState = {
			paddle1Up: keysDown.has("w"),
			paddle1Down: keysDown.has("s"),
			paddle2Up: keysDown.has("arrowup"),
			paddle2Down: keysDown.has("arrowdown"),
		};

		if (settings.gameMode === "computer") {
			const aiInput = computeComputerInput(game);
			humanInput.paddle2Up = aiInput.paddle2Up;
			humanInput.paddle2Down = aiInput.paddle2Down;
		}

		return humanInput;
	}

	function handleKeyDown(e: KeyboardEvent) {
		const key = e.key.toLowerCase();
		keysDown.add(key);

		if (["arrowup", "arrowdown"].includes(key)) {
			e.preventDefault();
		}

		if (key === "escape") {
			if (game.phase === "playing" || game.phase === "countdown") {
				returnToMenu(game);
			}
		}

		if (key === " " || key === "space") {
			e.preventDefault();
			if (game.phase === "menu") {
				startCountdown(game, settings);
			} else if (game.phase === "gameover") {
				returnToMenu(game);
			}
		}
	}

	function handleKeyUp(e: KeyboardEvent) {
		keysDown.delete(e.key.toLowerCase());
	}

	onMount(() => {
		const ctx = canvas.getContext("2d");
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

		const input = getInput();
		const prevPhase = game.phase;

		update(game, safeDt, input, settings);

		if (game.phase === "countdown" && game.countdownTimer <= 0) {
			startPlaying(game, settings);
		}

		if (game.phase === "gameover" && prevPhase === "playing") {
			onGameOver?.({
				score1: game.score1,
				score2: game.score2,
				winner: game.score1 > game.score2 ? "player1" : "player2",
				durationSeconds: Math.round(game.playTime),
				ballReturns: game.ballReturns,
				maxDeficit: game.maxDeficit,
				reachedDeuce: game.reachedDeuce,
			});
		}

		draw(ctx);
		requestAnimationFrame((t) => gameLoop(ctx, t));
	}

	function draw(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = "#0a0a1a";
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		if (game.scoreFlash) {
			const flashOpacity = Math.max(0, (game.scoreFlashTimer / 0.5) * 0.15);
			ctx.fillStyle = `rgba(255, 107, 157, ${flashOpacity})`;
			if (game.scoreFlash === "left") {
				ctx.fillRect(0, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT);
			} else {
				ctx.fillRect(CANVAS_WIDTH / 2, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT);
			}
		}

		ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
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

		ctx.shadowColor = "#ffffff";
		ctx.shadowBlur = glowIntensity * 10;
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(PADDLE_OFFSET, game.paddle1Y, PADDLE_WIDTH, PADDLE_HEIGHT);
		ctx.fillRect(
			CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH,
			game.paddle2Y,
			PADDLE_WIDTH,
			PADDLE_HEIGHT,
		);
		ctx.shadowBlur = 0;

		if (game.phase !== "menu") {
			ctx.fillStyle = "#ff6b9d";
			ctx.shadowColor = "#ff6b9d";
			ctx.shadowBlur = 15;
			ctx.beginPath();
			ctx.arc(game.ballX, game.ballY, BALL_RADIUS, 0, Math.PI * 2);
			ctx.fill();
			ctx.shadowBlur = 0;
		}

		ctx.font = "32px 'Press Start 2P', monospace";
		ctx.textAlign = "center";

		if (game.scoreFlash === "left" && game.scoreFlashTimer > 0) {
			ctx.fillStyle = "#ff6b9d";
			ctx.shadowColor = "#ff6b9d";
			ctx.shadowBlur = 20;
		} else {
			ctx.fillStyle = "#ffffff";
		}
		ctx.fillText(String(game.score1), CANVAS_WIDTH / 4, 50);
		ctx.shadowBlur = 0;

		if (game.scoreFlash === "right" && game.scoreFlashTimer > 0) {
			ctx.fillStyle = "#ff6b9d";
			ctx.shadowColor = "#ff6b9d";
			ctx.shadowBlur = 20;
		} else {
			ctx.fillStyle = "#ffffff";
		}
		ctx.fillText(String(game.score2), (CANVAS_WIDTH / 4) * 3, 50);
		ctx.shadowBlur = 0;

		if (game.phase === "playing" || game.phase === "countdown") {
			ctx.fillStyle = "rgba(107, 114, 128, 0.4)";
			ctx.font = "10px 'Inter', sans-serif";
			ctx.textAlign = "right";
			ctx.fillText(uiText.escQuit, CANVAS_WIDTH - 15, CANVAS_HEIGHT - 12);
			ctx.textAlign = "center";
		}

		if (game.phase === "menu") drawMenuOverlay(ctx);
		else if (game.phase === "countdown") drawCountdownOverlay(ctx);
		else if (game.phase === "gameover") drawGameOverOverlay(ctx);
	}

	function drawMenuOverlay(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = "rgba(10, 10, 26, 0.85)";
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		ctx.fillStyle = "#ff6b9d";
		ctx.shadowColor = "#ff6b9d";
		ctx.shadowBlur = 30;
		ctx.font = "48px 'Press Start 2P', monospace";
		ctx.textAlign = "center";
		ctx.fillText(uiText.title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
		ctx.shadowBlur = 0;

		const pulse = 0.4 + Math.abs(Math.sin(Date.now() / 500)) * 0.6;
		ctx.globalAlpha = pulse;
		ctx.fillStyle = "#ffffff";
		ctx.font = "16px 'Press Start 2P', monospace";
		ctx.fillText(uiText.pressSpace, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
		ctx.globalAlpha = 1.0;

		ctx.fillStyle = "#6b7280";
		ctx.font = "12px 'Inter', sans-serif";
		ctx.fillText(uiText.controlsReminder, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
	}

	function drawCountdownOverlay(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = "rgba(10, 10, 26, 0.6)";
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		const fractional = game.countdownTimer % 1;
		const scale = game.countdownDisplay === "GO!" ? 1.2 : 1 + fractional * 0.3;
		const fontSize = Math.round(72 * scale);

		ctx.fillStyle = game.countdownDisplay === "GO!" ? "#ff6b9d" : "#ffffff";
		ctx.shadowColor = game.countdownDisplay === "GO!" ? "#ff6b9d" : "#ffffff";
		ctx.shadowBlur = 20;
		ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(game.countdownDisplay, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
		ctx.shadowBlur = 0;
		ctx.textBaseline = "alphabetic";
	}

	function drawGameOverOverlay(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = "rgba(10, 10, 26, 0.85)";
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		ctx.fillStyle = "#ffffff";
		ctx.font = "36px 'Press Start 2P', monospace";
		ctx.textAlign = "center";
		ctx.fillText(uiText.gameOver, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 70);

		const winnerLabel = game.winner === "player1" ? uiText.player1 : uiText.player2;

		ctx.fillStyle = "#ff6b9d";
		ctx.shadowColor = "#ff6b9d";
		ctx.shadowBlur = 20;
		ctx.font = "24px 'Press Start 2P', monospace";
		ctx.fillText(
			`${winnerLabel} ${uiText.winsSuffix}`,
			CANVAS_WIDTH / 2,
			CANVAS_HEIGHT / 2 - 15,
		);
		ctx.shadowBlur = 0;

		ctx.fillStyle = "#9ca3af";
		ctx.font = "18px 'Inter', sans-serif";
		ctx.fillText(
			`${game.score1}  —  ${game.score2}`,
			CANVAS_WIDTH / 2,
			CANVAS_HEIGHT / 2 + 30,
		);

		const pulse = 0.4 + Math.abs(Math.sin(Date.now() / 500)) * 0.6;
		ctx.globalAlpha = pulse;
		ctx.fillStyle = "#ffffff";
		ctx.font = "14px 'Press Start 2P', monospace";
		ctx.fillText(uiText.pressSpace, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
		ctx.globalAlpha = 1.0;
	}
</script>