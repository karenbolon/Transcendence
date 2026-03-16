<script lang="ts">
	import PongGame from "$lib/component/pong/PongGame.svelte";
	import PongSettings from "$lib/component/pong/PongSettings.svelte";
	import PongControls from "$lib/component/pong/PongControls.svelte";
	import {
		SPEED_CONFIGS,
		type SpeedPreset,
		type GameMode,
		type GameSettings,
	} from "$lib/component/pong/gameEngine";

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
</script>

<!-- ═══ AMBIENT BACKGROUND EFFECTS ═══ -->
<div class="ambient-bg">
	<div class="corner-glow tl"></div>
	<div class="corner-glow br"></div>
	<div class="retro-grid"></div>
	{#each Array(25) as _, i}
		<div
			class="particle"
			style="
				left: {Math.random() * 100}%;
				width: {2 + Math.random() * 4}px;
				height: {2 + Math.random() * 4}px;
				animation-duration: {8 + Math.random() * 12}s;
				animation-delay: {Math.random() * 10}s;
				--particle-color: {['rgba(255,107,157,0.4)', 'rgba(168,85,247,0.3)', 'rgba(96,165,250,0.2)'][i % 3]};
			"
		></div>
	{/each}
</div>

<div class="game-container">
	<h1 class="game-title">PONG</h1>

	<!-- Settings — only visible during menu -->
	{#if gamePhase === "menu"}
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
	{/if}

	<!-- The game canvas -->
	<PongGame bind:this={pongGame} {settings} onGameOver={handleGameOver} />

	<!-- Status bar — changes based on game phase -->
	<div class="status-bar">
		{#if gamePhase === "menu"}
			<span class="status-text">Press SPACE to start</span>
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

	/* ═══════════════════════════════════════════════════════ */
	/*  AMBIENT BACKGROUND                                    */
	/* ═══════════════════════════════════════════════════════ */
	.ambient-bg {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}

	.corner-glow {
		position: absolute;
		width: 400px;
		height: 400px;
		border-radius: 50%;
		filter: blur(120px);
	}
	.corner-glow.tl {
		top: -150px;
		left: -150px;
		background: rgba(168, 85, 247, 0.08);
	}
	.corner-glow.br {
		bottom: -150px;
		right: -150px;
		background: rgba(255, 107, 157, 0.06);
	}

	.retro-grid {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 40vh;
		background: linear-gradient(180deg, transparent 0%, rgba(168, 85, 247, 0.03) 100%);
		mask-image: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
		-webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
		overflow: hidden;
	}
	.retro-grid::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			repeating-linear-gradient(90deg, rgba(168,85,247,0.08) 0px, transparent 1px, transparent 60px),
			repeating-linear-gradient(0deg, rgba(168,85,247,0.08) 0px, transparent 1px, transparent 60px);
		transform: perspective(400px) rotateX(55deg);
		transform-origin: bottom;
		animation: grid-scroll 4s linear infinite;
	}
	@keyframes grid-scroll {
		0% { background-position: 0 0; }
		100% { background-position: 0 60px; }
	}

	.particle {
		position: absolute;
		bottom: 0;
		border-radius: 50%;
		background: var(--particle-color);
		box-shadow: 0 0 8px var(--particle-color);
		animation: float-particle linear infinite;
		opacity: 0;
	}
	@keyframes float-particle {
		0%   { transform: translateY(0) scale(0); opacity: 0; }
		10%  { opacity: 0.8; }
		90%  { opacity: 0.8; }
		100% { transform: translateY(-100vh) scale(1); opacity: 0; }
	}
	.game-container {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		width: 100%;
	}

	.status-bar {
		min-height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
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
</style>
