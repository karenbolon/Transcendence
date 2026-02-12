<script lang="ts">
	import PongGame from '$lib/component/pong/PongGame.svelte';
	import PongSettings from '$lib/component/pong/PongSettings.svelte';
	import PongControls from '$lib/component/pong/PongControls.svelte';
	import { SPEED_CONFIGS, type SpeedPreset, type GameMode, type GameSettings } from '$lib/component/pong/gameEngine';

	let gameMode = $state<GameMode>('local');
	let winScore = $state(5);
	let speedPreset = $state<SpeedPreset>('normal');
	let player2Name = $state('');

	// Build the settings object that PongGame needs
	let settings = $derived<GameSettings>({
		winScore,
		ballSpeed: SPEED_CONFIGS[speedPreset].ballSpeed,
		maxBallSpeed: SPEED_CONFIGS[speedPreset].maxBallSpeed,
		gameMode,
	});

	let pongGame: PongGame;

	// Track game phase for showing/hiding UI elements
	let gamePhase = $state('menu');

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

	let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

	async function handleGameOver(result: {
		score1: number;
		score2: number;
		winner: 'player1' | 'player2';
		durationSeconds: number;
	}) {
		saveStatus = 'saving';

		// Determine Player 2's display name
		const p2DisplayName = gameMode === 'computer' ? 'Computer' : (player2Name.trim() || 'Guest');

		try {
			const response = await fetch('/api/matches', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
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
				saveStatus = 'saved';
			} else {
				// Not logged in or validation error — still fine, game works
				const data = await response.json();
				console.warn('Match not saved:', data.error);
				saveStatus = 'error';
			}
		} catch (err) {
			// Network error — game still works, just not saved
			console.warn('Could not save match:', err);
			saveStatus = 'error';
		}

		// Reset status after a few seconds
		setTimeout(() => { saveStatus = 'idle'; }, 3000);
	}
</script>

<div class="game-container">
	<h1 class="game-title">PONG</h1>

	<!-- Settings — only visible during menu -->
	{#if gamePhase === 'menu'}
		<PongSettings
			{gameMode}
			{winScore}
			{speedPreset}
			{player2Name}
			onGameModeChange={(v) => gameMode = v}
			onWinScoreChange={(v) => winScore = v}
			onSpeedChange={(v) => speedPreset = v}
			onPlayer2NameChange={(v) => player2Name = v}
		/>
	{/if}

	<!-- The game canvas -->
	<PongGame bind:this={pongGame} {settings} onGameOver={handleGameOver} />

	<!-- Status bar — changes based on game phase -->
	<div class="status-bar">
		{#if gamePhase === 'menu'}
			<span class="status-text">Press SPACE to start</span>
		{:else if gamePhase === 'countdown'}
			<span class="status-text">Get ready...</span>
		{:else if gamePhase === 'playing'}
			<PongControls {gameMode} />
		{:else if gamePhase === 'gameover'}
			<div class="gameover-status">
				<span class="status-text">Press SPACE to play again</span>
				{#if saveStatus === 'saving'}
					<span class="save-indicator saving">Saving match...</span>
				{:else if saveStatus === 'saved'}
					<span class="save-indicator saved">✓ Match saved</span>
				{:else if saveStatus === 'error'}
					<span class="save-indicator error">Match not saved (not logged in?)</span>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.game-container {
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
