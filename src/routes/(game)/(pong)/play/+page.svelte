<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import PongGame from "$lib/component/pong/PongGame.svelte";
	import PongSettings from "$lib/component/pong/PongSettings.svelte";
	import PongControls from "$lib/component/pong/PongControls.svelte";
	import LevelUpModal from "$lib/component/progression/LevelUpModal.svelte";
	import type { XpBonus, NewAchievement } from '$lib/types/progression';
	import {
		SPEED_CONFIGS,
		type SpeedPreset,
		type GameMode,
		type GamePhase,
		type GameSettings,
		type Difficulty,
	} from "$lib/component/pong/gameEngine";
	import type { CourtThemeName } from "$lib/component/pong/courtThemes";
	import { _ } from 'svelte-i18n';

	let gameMode = $state<GameMode>("local");
	let winScore = $state(5);
	let speedPreset = $state<SpeedPreset>("normal");
	let player2Name = $state("");
	let difficulty = $state<Difficulty>("medium");
	let courtTheme = $state<CourtThemeName>("classic");
	let powerUpsEnabled = $state(false);

	// ── Layout data (user info) ──────────────────────────────
	let layoutData = $derived($page.data);

	// ── Settings persistence ─────────────────────────────────
	const SETTINGS_KEY = 'pong-settings';
	let settingsLoaded = false;
	let pongGame: PongGame;

	// ── Game phase tracking ──────────────────────────────────
	let gamePhase = $state<GamePhase>("menu");
	let prevPhase = $state<GamePhase>("menu");


	let saveStatus = $state<"idle" | "saving" | "saved" | "error">("idle");

	// ── Active game tracking ─────────────────────────────────
	let activeGameId = $state<number | null>(null);

	// ── Invite panel state ───────────────────────────────────
	type UserItem = {
		id: number;
		username: string;
		avatar_url: string | null;
		is_online: boolean | null;
	};

	let friends = $state<UserItem[]>([]);
	let searchQuery = $state("");
	let searchResults = $state<UserItem[]>([]);
	let searching = $state(false);
	let invitedUsername = $state<string | null>(null);
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;

	// Load saved settings on mount
	onMount(() => {
		loadSavedSettings();
		settingsLoaded = true;
	});

	// Update phase
	$effect(() => {
		const interval = setInterval(() => {
			if (pongGame) {
				const state = pongGame.getGameState();
				if (state) {
					const newPhase = state.phase;
					if (newPhase !== prevPhase) {
						if (newPhase === "countdown" || newPhase === "playing") {
							markGameActive();
						} else if (newPhase === "gameover" || newPhase === "menu") {
							clearActiveGame();
							// Reset online state if leaving an online match
							if (newPhase === "menu" && matchFound) {
								returnToOnlineMenu();
							}
						}
						prevPhase = newPhase;
					}
					gamePhase = newPhase;
				}
			}
		}, 100);

		return () => {
			clearInterval(interval);
			clearActiveGame();
		};
	});

	function loadSavedSettings() {
		try {
			const saved = localStorage.getItem(SETTINGS_KEY);
			if (!saved) return;
			const parsed = JSON.parse(saved);
			if (parsed.gameMode && ['local', 'computer', 'online'].includes(parsed.gameMode)) {
				gameMode = parsed.gameMode;
			}
			if (parsed.winScore && [3, 5, 7, 11].includes(parsed.winScore)) {
				winScore = parsed.winScore;
			}
			if (parsed.speedPreset && ['chill', 'normal', 'fast'].includes(parsed.speedPreset)) {
				speedPreset = parsed.speedPreset;
			}
			if (parsed.difficulty && ['easy', 'medium', 'hard'].includes(parsed.difficulty)) {
				difficulty = parsed.difficulty;
			}
			if (parsed.courtTheme && ['classic', 'neon', 'retro', 'ocean', 'pastel'].includes(parsed.courtTheme)) {
				courtTheme = parsed.courtTheme;
			}
			if (typeof parsed.powerUpsEnabled === 'boolean') {
				powerUpsEnabled = parsed.powerUpsEnabled;
			}
		} catch {
			// Invalid or missing — use defaults
		}
	}

	$effect(() => {
		if (!settingsLoaded) return;
		const current = { gameMode, winScore, speedPreset, difficulty, courtTheme, powerUpsEnabled };
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
	});

	// ── Online game state ────────────────────────────────────
	let onlineGameId: string | null = $state(null);
	let onlineOpponent: string = $state("");
	let playerSide: "left" | "right" = $state("left");
	let matchFound = $state(false);
	let opponentDisconnected = $state(false);
	let onlineGameOverResult: { winner: string; score1: number; score2: number } | null = $state(null);
	let onlinePausedByMe = $state(false);


	let saveMessageKey = $state<string | null>(null);
	let saveMessageParams = $state<Record<string, string> | null>(null);
	let saveErrorKey = $state<string | null>(null);

	// Progression state for level-up modal
	let showLevelUpModal = $state(false);
	let progressionResult = $state<{
		xpEarned: number;
		bonuses: { name: string; amount: number }[];
		oldLevel: number;
		newLevel: number;
		currentXp: number;
		xpForNextLevel: number;
		newAchievements: NewAchievement[];
	} | null>(null);

	// Build the settings object that PongGame needs
	let settings = $derived<GameSettings>({
		winScore,
		ballSpeed: SPEED_CONFIGS[speedPreset].ballSpeed,
		maxBallSpeed: SPEED_CONFIGS[speedPreset].maxBallSpeed,
		gameMode,
		difficulty,
	});

	async function clearActiveGame() {
		if (!activeGameId) return;
		const id = activeGameId;
		activeGameId = null;
		try {
			await fetch("/api/games/activity", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ gameId: id }),
			});
		} catch {
			// Best effort
		}
	}

	async function markGameActive() {
		if (activeGameId) return;
		try {
			const p2Name = gameMode === "computer" ? "Computer" : player2Name.trim() || "Guest";
			const res = await fetch("/api/games/activity", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ gameMode, player2Name: p2Name }),
			});
			if (res.ok) {
				const data = await res.json();
				activeGameId = data.gameId;
			}
		} catch {
			// Not logged in or network error
		}
	}

	async function handleGameOver(result: {
		score1: number;
		score2: number;
		winner: "player1" | "player2";
		durationSeconds: number;
		ballReturns: number;
		longestRally: number;
		maxDeficit: number;
		reachedDeuce: boolean;
	}) {
		saveStatus = "saving";
		saveMessageKey = null;
		saveMessageParams = null;
		saveErrorKey = null;

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
					ballReturns: result.ballReturns,
					maxDeficit: result.maxDeficit,
					reachedDeuce: result.reachedDeuce,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				saveStatus = "saved";
				saveMessageKey = data.messageKey ?? null;
				saveMessageParams = data.messageParams ?? null;
				// const data = await response.json();

				// Show progression modal after every match
				if (data.progression) {
					progressionResult = data.progression;
					showLevelUpModal = true;
				}
			} else {
				// Not logged in or validation error — still fine, game works
				// const data = await response.json();
				console.warn("Match not saved:", data.errorKey || data.error);
				saveErrorKey = data.errorKey ?? 'errors.match_not_saved';
				saveStatus = "error";
			}
		} catch (err) {
			// Network error — game still works, just not saved
			console.warn("Could not save match:", err);
			saveErrorKey = 'matches.errors.errors.match_not_saved';
			saveStatus = "error";
		}

		// Reset status after a few seconds
		setTimeout(() => {
			saveStatus = "idle";
			saveMessageKey = null;
			saveMessageParams = null;
			saveErrorKey = null;
		}, 3000);
	}

	function returnToOnlineMenu() {
		matchFound = false;
		onlineGameId = null;
		onlineOpponent = "";
		onlineGameOverResult = null;
		opponentDisconnected = false;
		onlinePausedByMe = false;
	}

	// Player display names
	let player1DisplayName = $derived(
		layoutData?.user?.username ?? "Player 1"
	);
	let player2DisplayName = $derived(
		gameMode === "online" && onlineOpponent
			? onlineOpponent
			: gameMode === "computer"
				? "Computer"
				: player2Name.trim() || "Guest"
	);

	// Player 2 avatar emoji
	let p2Emoji = $derived(
		gameMode === "computer" ? "🤖" : gameMode === "online" ? "🌐" : "👾"
	);
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
					{difficulty}
					username={layoutData?.user?.username}
					onGameModeChange={(v) => (gameMode = v)}
					onWinScoreChange={(v) => (winScore = v)}
					onSpeedChange={(v) => (speedPreset = v)}
					onPlayer2NameChange={(v) => {
						player2Name = v;
						invitedUsername = null;
					}}
					onDifficultyChange={(v) => (difficulty = v)}
					{courtTheme}
					onThemeChange={(v) => (courtTheme = v)}
					{powerUpsEnabled}
					onPowerUpsChange={(v) => (powerUpsEnabled = v)}
					onStartGame={() => pongGame?.rematch()}
				/>
			</div>

			<!-- Right: Invite panel (online mode only) -->
			<!-- {#if gameMode === "online"}
			<div class="invite-panel">
				<div class="invite-header">
					<span class="invite-title">👥 Invite Player</span>
				</div>

				<input
					class="search-input"
					type="text"
					placeholder="🔍 Search users..."
					value={searchQuery}
					oninput={(e) => handleSearchInput(e.currentTarget.value)}
				/>

				<div class="user-list">
					{#if searching}
						<div class="user-list-status">Searching...</div>
					{:else if searchQuery.trim().length >= 2 && searchResults.length === 0}
						<div class="user-list-status">No users found</div>
					{:else if displayedUsers.length === 0}
						<div class="user-list-status">
							{#if layoutData?.user}
								No friends yet
							{:else}
								Log in to see friends
							{/if}
						</div>
					{:else}
						{#each displayedUsers as user (user.id)}
							<div class="user-row" class:invited={invitedUsername === user.username}>
								<div class="user-info">
									<UserAvatar
										username={user.username}
										avatarUrl={user.avatar_url}
										size="sm"
										status={user.is_online ? 'online' : 'offline'}
									/>
									<span class="user-name">@{user.username}</span>
								</div>
								<button
									class="invite-btn"
									disabled={invitedUsername === user.username}
								>
									{invitedUsername === user.username ? "✓ Invited" : "Invite"}
								</button>
							</div>
						{/each}
					{/if}
				</div>
			</div>-->
		</div>
	{/if}

	{#if gamePhase !== "menu" || (gameMode === "online" && matchFound)}
		<!-- Player names above canvas-->
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

	<!-- {#if gameMode === "online" && opponentDisconnected}
		<div class="online-status-banner warning">
			Opponent disconnected — waiting for reconnection...
		</div>
	{/if} -->

	<!-- Canvas: always mounted, hidden during menu (show when online match found) -->
	<div class="canvas-wrapper" class:hidden={gamePhase === "menu" && !(gameMode === "online" && matchFound)}>
		<PongGame
			bind:this={pongGame}
			{settings}
			{courtTheme}
			{powerUpsEnabled}
			onGameOver={handleGameOver}
			{playerSide}
		/>
	</div>

	<!-- Status bar -->
	<div class="status-bar">
		{#if gameMode === "online" && matchFound && onlineGameOverResult}
			<!-- Online game over -->
			 <div class="gameover-status">
				<span class="status-text">
					{onlineGameOverResult.winner} wins! ({onlineGameOverResult.score1} - {onlineGameOverResult.score2})
				</span>
				<button class="online-return-btn" onclick={returnToOnlineMenu}>
					Return to menu
				</button>
			</div>
		{:else if gameMode === "online" && matchFound}
			<!-- Online match in progress -->
			<span class="status-text">
				{#if playerSide === "left"}
					Controls: W / S
				{:else}
					Controls: Arrow Up / Arrow Down
				{/if}
			</span>
		{:else if gamePhase === "menu"}
			<span class="status-text">{$_('matches.status.play')}</span>
		{:else if gamePhase === "countdown"}
			<span class="status-text">{$_('matches.status.get_ready')}</span>
		{:else if gamePhase === "playing"}
			<PongControls {gameMode} />
		{:else if gamePhase === "paused"}
			<span class="status-text">Game paused</span>
		{:else if gamePhase === "gameover"}
			<div class="gameover-status">
				<div class="gameover-buttons">
					<button class="rematch-btn" onclick={() => pongGame.rematch()}>
						Rematch
					</button>
					<button class="menu-btn" onclick={() => pongGame.goToMenu()}>
						Back to Menu
					</button>
				</div>
				{#if saveStatus === "saving"}
					<span class="save-indicator saving">{$_('common.saving')}</span>
				{:else if saveStatus === "saved"}
					<span class="save-indicator saved">
						{#if saveMessageKey}
							✓ {$_(saveMessageKey, saveMessageParams ?? {})}
						{:else}
							✓ {$_('matches.status.saved')}
						{/if}
					</span>
					{#if progressionResult}
						<span class="xp-indicator">+{progressionResult.xpEarned} XP</span>
					{/if}
				{:else if saveStatus === "error"}
					<span class="save-indicator error">
						{#if saveErrorKey}
							{$_(saveErrorKey)}
						{:else}
							{$_('errors.match_not_saved')}
						{/if}
					</span>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Level-Up / Achievement Modal -->
{#if showLevelUpModal && progressionResult}
	<LevelUpModal
		xpEarned={progressionResult.xpEarned}
		bonuses={progressionResult.bonuses}
		oldLevel={progressionResult.oldLevel}
		newLevel={progressionResult.newLevel}
		currentXp={progressionResult.currentXp}
		xpForNextLevel={progressionResult.xpForNextLevel}
		newAchievements={progressionResult.newAchievements}
		onClose={() => {
			showLevelUpModal = false;
			progressionResult = null;
		}}
	/>
{/if}

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
	/* ===== Canvas wrapper ===== */
	.canvas-wrapper {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	.canvas-wrapper.hidden {
		position: absolute;
		left: -9999px;
		visibility: hidden;
		pointer-events: none;
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

	/* ===== Invite panel ===== */
	/* .invite-panel {
		width: 280px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 1rem;
		border-radius: 1rem;
		background: linear-gradient(135deg, rgba(22,22,58,0.8), rgba(16,16,42,0.9));
		backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.06);
		position: relative;
		overflow: hidden;
	} */
	/* background: rgba(255, 255, 255, 0.03);
	border: 1px solid rgba(255, 255, 255, 0.06); */

	/* .invite-panel::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent);
		opacity: 0.6;
	}

	.invite-header {
		display: flex;
		align-items: center;
	}

	.invite-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: #d1d5db;
	}

	.search-input {
		width: 100%;
		padding: 0.45rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		color: #d1d5db;
		font-size: 0.8rem;
		font-family: inherit;
		outline: none;
		transition: all 0.2s;
		box-sizing: border-box;
	}

	.search-input:focus {
		border-color: rgba(255, 107, 157, 0.4);
		box-shadow: 0 0 12px rgba(255, 107, 157, 0.08);
	}

	.search-input::placeholder {
		color: #4b5563;
	}

	.user-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		max-height: 240px;
		overflow-y: auto;
	}

	.user-list-status {
		text-align: center;
		color: #6b7280;
		font-size: 0.8rem;
		padding: 1.5rem 0.5rem;
	}

	.user-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.4rem 0.5rem;
		border-radius: 0.5rem;
		transition: background-color 0.15s;
	}

	.user-row:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.user-row.invited {
		background: rgba(255, 107, 157, 0.08);
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.user-name {
		font-size: 0.8rem;
		color: #d1d5db;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.invite-btn {
		padding: 0.25rem 0.6rem;
		border-radius: 0.4rem;
		border: 1px solid rgba(255, 107, 157, 0.3);
		background: rgba(255, 107, 157, 0.1);
		color: #ff6b9d;
		font-size: 0.7rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.invite-btn:hover:not(:disabled) {
		background: rgba(255, 107, 157, 0.2);
		border-color: rgba(255, 107, 157, 0.5);
	}

	.invite-btn:disabled {
		color: #4ade80;
		border-color: rgba(74, 222, 128, 0.3);
		background: rgba(74, 222, 128, 0.08);
		cursor: default;
	} */

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

	.xp-indicator {
		color: #ff6b9d;
		font-size: 0.85rem;
		font-weight: 600;
		animation: xpPop 0.3s ease-out;
	}
	/* ===== Status bar ===== */
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

	.gameover-buttons {
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

	/* ===== Online status ===== */
	/* .online-status-banner {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.8rem;
		text-align: center;
		width: 100%;
		max-width: 900px;
	}

	.online-status-banner.warning {
		background: rgba(251, 191, 36, 0.1);
		border: 1px solid rgba(251, 191, 36, 0.3);
		color: #fbbf24;
	} */

	.online-return-btn {
		padding: 0.4rem 1rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 107, 157, 0.3);
		background: rgba(255, 107, 157, 0.1);
		color: #ff6b9d;
		font-size: 0.8rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.online-return-btn:hover {
		background: rgba(255, 107, 157, 0.2);
		border-color: rgba(255, 107, 157, 0.5);
	}

	/* ===== Responsive ===== */
	@media (max-width: 640px) {
		.menu-layout {
			flex-direction: column;
			align-items: center;
		}

		/* .invite-panel {
			width: 100%;
			max-width: 500px;
		} */
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

	@keyframes xpPop {
		from {
			transform: scale(0.5);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>
