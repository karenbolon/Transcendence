<script lang="ts">
	import { page } from "$app/stores";
	import PongGame from "$lib/component/pong/PongGame.svelte";
	import PongSettings from "$lib/component/pong/PongSettings.svelte";
	import PongControls from "$lib/component/pong/PongControls.svelte";
	import AmbientBackground from "$lib/component/AmbientBackground.svelte";
	import Starfield from "$lib/component/Starfield.svelte";
	import Aurora from "$lib/component/Aurora.svelte";
	import Scanlines from "$lib/component/Scanlines.svelte";
	import NoiseGrain from "$lib/component/NoiseGrain.svelte";
	import {
		SPEED_CONFIGS,
		type SpeedPreset,
		type GameMode,
		type GameSettings,
	} from "$lib/component/pong/gameEngine";

	let layoutData = $derived($page.data);

	let gameMode = $state<GameMode>("local");
	let winScore = $state(5);
	let speedPreset = $state<SpeedPreset>("normal");
	let player2Name = $state("");

	// Build the settings object that PongGame needs
	let settings = $derived<GameSettings>({
		winScore,
		ballSpeed: SPEED_CONFIGS[speedPreset].ballSpeed,
		maxBallSpeed: SPEED_CONFIGS[speedPreset].maxBallSpeed,
		gameMode,
	});

	let pongGame: PongGame;

	// Track game phase for showing/hiding UI elements
	let gamePhase = $state("menu");

	// Update phase by polling (simple approach)
	$effect(() => {
		const interval = setInterval(() => {
			if (pongGame) {
				const state = pongGame.getGameState();
				if (state) gamePhase = state.phase;
			}
		}, 100);

		return () => clearInterval(interval);
	});

	let saveStatus = $state<"idle" | "saving" | "saved" | "error">("idle");

	async function handleGameOver(result: {
		score1: number;
		score2: number;
		winner: "player1" | "player2";
		durationSeconds: number;
	}) {
		saveStatus = "saving";

		// Determine Player 2's display name
		const p2DisplayName =
			gameMode === "computer"
				? "Computer"
				: player2Name.trim() || "Guest";

		try {
			const response = await fetch("/matches", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					gameMode,
					player2Name: p2DisplayName,
					player1Score: result.score1,
					player2Score: result.score2,
					winner: result.winner,
					winScore,
					speedPreset,
					durationSeconds: result.durationSeconds,
				}),
			});

			if (response.ok) {
				saveStatus = "saved";
			} else {
				// Not logged in or validation error — still fine, game works
				const data = await response.json();
				console.warn("Match not saved:", data.error);
				saveStatus = "error";
			}
		} catch (err) {
			// Network error — game still works, just not saved
			console.warn("Could not save match:", err);
			saveStatus = "error";
		}

		// Reset status after a few seconds
		setTimeout(() => {
			saveStatus = "idle";
		}, 3000);
	}

	// Player display names
	let player1DisplayName = $derived(
		layoutData?.user?.username ?? "Player 1"
	);
	let player2DisplayName = $derived(
		gameMode === 'local' ? player2Name.trim() || "Guest" : "Computer"
	);

	// Player 2 avatar emoji
	let p2Emoji = $derived(
		gameMode === "computer" ? "🤖" : gameMode === "local" ? "👤" : "👾"
	);
</script>

<!-- PREVIEW: uncomment one at a time to compare -->
<AmbientBackground bgColor="#0a0a1e" maxDelay={1} />
<Starfield starCount={30} />
<Aurora />
<Scanlines opacity={0.04} />
<!-- <NoiseGrain opacity={0.03} /> -->

<div class="game-container">
	<!-- Settings — only visible during menu -->
	{#if gamePhase === "menu"}
		<div class="game-header">
			<h1 class="pong-title">PONG</h1>
			<p class="pong-subtitle">ft_transcendence</p>
		</div>

		<!-- ═══ MENU PHASE ═══ -->
		<div class="menu-layout">
			<!-- Left: Settings -->
			<div class="menu-left">
				<PongSettings
					{gameMode}
					{winScore}
					{speedPreset}
					{player2Name}
					onGameModeChange={(v) => (gameMode = v)}
					onWinScoreChange={(v) => (winScore = v)}
					onSpeedChange={(v) => (speedPreset = v)}
					onPlayer2NameChange={(v) => (player2Name = v)}
				/>
			</div>
		</div>
	{/if}

	{#if gamePhase !== "menu"}
		<!-- Player names above canvas -->
		<div class="player-bar">
			<div class="player-side">
				<div class="player-avatar p1">🎮</div>
				<div class="player-info-block">
					<span class="player-name p1">{player1DisplayName}</span>
					<span class="player-controls-hint">W / S</span>
				</div>
			</div>
			<div class="vs-badge">VS</div>

			<div class="player-side">
				<div class="player-info-block right">
					<span class="player-name p2">{player2DisplayName}</span>
					<span class="player-controls-hint">↑ / ↓</span>
				</div>
				<div class="player-avatar p2">{p2Emoji}</div>
			</div>
		</div>
	{/if}

	<!-- The game canvas -->
	<div class="canvas-wrapper" class:hidden={gamePhase === "menu"}>
		<PongGame bind:this={pongGame} {settings} onGameOver={handleGameOver} />
	</div>

	<!-- Status bar — changes based on game phase -->
	<div class="status-bar">
		{#if gamePhase === "menu"}
			<span class="status-text">Press SPACE to play</span>
		{:else if gamePhase === "countdown"}
			<span class="status-text">Get ready...</span>
		{:else if gamePhase === "playing"}
			<PongControls {gameMode} />
		{:else if gamePhase === "gameover"}
			<div class="gameover-status">
				<span class="status-text">Press SPACE to play again</span>
				{#if saveStatus === "saving"}
					<span class="save-indicator saving">Saving match...</span>
				{:else if saveStatus === "saved"}
					<span class="save-indicator saved">✓ Match saved</span>
				{:else if saveStatus === "error"}
					<span class="save-indicator error"
						>Match not saved (not logged in?)</span
					>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.game-container {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		width: 100%;
		padding: 1rem 0 2rem;
	}

	.game-header {
		text-align: center;
		padding: 2.5rem 0 0.5rem;
	}

	.pong-title {
		font-family: 'Press Start 2P', cursive;
		padding: 3rem 0 3rem;
		font-size: 5rem;
		color: var(--accent);
		text-shadow:
			0 0 10px rgba(255, 107, 157, 0.6),
			0 0 40px rgba(255, 107, 157, 0.4),
			0 0 80px rgba(255, 107, 157, 0.2),
			0 0 120px rgba(255, 107, 157, 0.1);
		letter-spacing: 0.3em;
		animation: title-glow 3s ease-in-out infinite alternate, title-float 4s ease-in-out infinite;
		margin: 0;
		position: relative;
	}

	@keyframes title-glow {
		0%   { text-shadow: 0 0 10px rgba(255,107,157,0.5), 0 0 40px rgba(255,107,157,0.3), 0 0 80px rgba(255,107,157,0.15); }
		100% { text-shadow: 0 0 20px rgba(255,107,157,0.7), 0 0 60px rgba(255,107,157,0.5), 0 0 100px rgba(255,107,157,0.3); }
	}

	@keyframes title-float {
		0%, 100% { transform: translateY(0); }
		50%      { transform: translateY(-8px); }
	}

	.pong-subtitle {
		font-family: 'Courier New', monospace;
		font-size: 0.8rem;
		color: #7a7a9e;
		letter-spacing: 0.5em;
		text-transform: uppercase;
		margin-top: 0.5rem;
		opacity: 0.7;
	}

	/* ===== Menu phase: two-column layout ===== */
	.menu-layout {
		display: flex;
		gap: 1.5rem;
		width: 100%;
		max-width: 950px;
		align-items: flex-start;
	}

	.menu-left {
		flex: 1;
		display: flex;
		justify-content: center;
	}
	/* ===== Player bar (above canvas) ===== */
	.player-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2.5rem;
		width: 100%;
		max-width: 900px;
		padding: 1rem 1rem;
	}
	.player-side {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex: 1;
		min-width: 0;
	}

	.player-side:first-child {
		justify-content: flex-end;
	}

	.player-side:last-child {
		justify-content: flex-start;
	}

	.player-avatar {
		width: 46px;
		height: 46px;
		border-radius: 50%;
		border: 2px solid;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.3rem;
		flex-shrink: 0;
	}

	.player-avatar.p1 {
		border-color: #60a5fa;
		background: rgba(96, 165, 250, 0.1);
		box-shadow: 0 0 15px rgba(96, 165, 250, 0.15);
	}

	.player-avatar.p2 {
		border-color: var(--accent);
		background: rgba(255, 107, 157, 0.1);
		box-shadow: 0 0 15px rgba(255, 107, 157, 0.15);
	}

	.player-info-block {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.player-info-block.right {
		text-align: right;
	}

	.player-name {
		font-family: 'Press Start 2P', cursive;
		font-size: 1.6rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.player-name.p1 {
		color: #60a5fa;
	}

	.player-name.p2 {
		color: #ff6b9d;
	}
	.player-controls-hint {
		font-family: 'Inter', sans-serif;
		font-size: 0.75rem;
		color: #9ca3af;
		letter-spacing: 0.05em;
		font-weight: 700;
	}

	.vs-badge {
		font-family: 'Press Start 2P', cursive;
		font-size: 0.55rem;
		color: #6b7280;
		background: rgba(255, 255, 255, 0.04);
		padding: 0.35rem 0.7rem;
		border-radius: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.06);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		flex-shrink: 0;
	}


	.status-bar {
		min-height: 3.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: 900px;
	}

	.status-text {
		color: #6b7280;
		font-size: 0.85rem;
	}

	.gameover-status {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
	}

	/* .gameover-buttons {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 0.4rem;
	}

	.rematch-btn {
		padding: 0.5rem 1.5rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 107, 157, 0.4);
		background: rgba(255, 107, 157, 0.15);
		color: #ff6b9d;
		font-size: 0.85rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.rematch-btn:hover {
		background: rgba(255, 107, 157, 0.25);
		border-color: rgba(255, 107, 157, 0.6);
	}

	.menu-btn {
		padding: 0.5rem 1.5rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: transparent;
		color: #9ca3af;
		font-size: 0.85rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.menu-btn:hover {
		border-color: rgba(255, 255, 255, 0.25);
		color: #d1d5db;
	} */

	.save-indicator {
		font-size: 0.75rem;
	}

	.save-indicator.saving {
		color: #9ca3af;
	}

	.save-indicator.saved {
		color: #4ade80;
	}

	.save-indicator.error {
		color: #9ca3af;
		font-style: italic;
	}

	/* ===== Responsive ===== */
	@media (max-width: 640px) {
		.menu-layout {
			flex-direction: column;
			align-items: center;
		}

		.pong-title {
			font-size: 3rem;
		}

		.player-bar {
			gap: 0.75rem;
		}

		.player-name {
			font-size: 0.7rem;
		}

		.player-avatar {
			width: 30px;
			height: 30px;
			font-size: 0.9rem;
		}
	}
</style>
