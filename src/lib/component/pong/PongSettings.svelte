
<script lang="ts">
	import { _, isLoading } from 'svelte-i18n';
	import type { SpeedPreset, GameMode, Difficulty } from './gameEngine';
	import type { CourtThemeName } from './courtThemes';

	type Props = {
		gameMode: GameMode;
		winScore: number;
		speedPreset: SpeedPreset;
		player2Name: string;
		difficulty: Difficulty;
		courtTheme: CourtThemeName;
		username?: string;
		onGameModeChange: (mode: GameMode) => void;
		onWinScoreChange: (score: number) => void;
		onSpeedChange: (preset: SpeedPreset) => void;
		onPlayer2NameChange: (name: string) => void;
		onDifficultyChange: (d: Difficulty) => void;
		onThemeChange: (theme: CourtThemeName) => void;
		powerUpsEnabled: boolean;
		onPowerUpsChange: (enabled: boolean) => void;
		onStartGame?: () => void;
	};

	let {
		gameMode,
		winScore,
		speedPreset,
		player2Name,
		difficulty,
		courtTheme,
		username,
		onGameModeChange,
		onWinScoreChange,
		onSpeedChange,
		onPlayer2NameChange,
		onDifficultyChange,
		onThemeChange,
		powerUpsEnabled,
		onPowerUpsChange,
		onStartGame
	}: Props = $props();

	// Point options and speed presets defined here (display data only)
	const pointOptions = [3, 5, 7, 11];

	// Derived reactive values for Svelte 5
	const modeOptions = $derived([
		{ key: 'local' as GameMode, label: $isLoading ? 'Local 1v1' : $_('pong_settings.game_mode.local') },
		{ key: 'computer' as GameMode, label: $isLoading ? 'vs Computer' : $_('pong_settings.game_mode.computer') },
		{ key: 'online' as GameMode, label: $isLoading ? 'Online' : $_('pong_settings.game_mode.online') }
	]);

	const speedOptions = $derived([
		{ key: 'chill' as SpeedPreset, label: $isLoading ? 'Chill' : $_('pong_settings.ball_speed.chill') },
		{ key: 'normal' as SpeedPreset, label: $isLoading ? 'Normal' : $_('pong_settings.ball_speed.normal') },
		{ key: 'fast' as SpeedPreset, label: $isLoading ? 'Fast' : $_('pong_settings.ball_speed.fast') },
	]);

	const difficultyOptions: { key: Difficulty; label: string }[] = [
		{ key: 'easy',   label: '😌 Easy' },
		{ key: 'medium', label: '🏓 Medium' },
		{ key: 'hard',   label: '🔥 Hard' },
	];

	const themeOptions: { key: CourtThemeName; color: string; label: string }[] = [
		{ key: 'classic', color: '#ff6b9d', label: 'Classic' },
		{ key: 'neon',    color: '#ff00ff', label: 'Neon' },
		{ key: 'retro',   color: '#33ff33', label: 'Retro' },
		{ key: 'ocean',   color: '#38bdf8', label: 'Ocean' },
		{ key: 'pastel',  color: '#c4b5fd', label: 'Pastel' },
	];

	// ── Matchmaking state ────────────────────────────────────
	let searching = $state(false);
	let queuePosition = $state(0);
	let settingsLocked = $derived(gameMode === 'online' && searching);
</script>

<div class="settings-panel">
	<div class="accent-line"></div>

	<div class="card-title">
		<span class="title-dot"></span>
		Game Settings
	</div>

	<!-- Game mode -->
	<div class="setting-row">
		<span class="setting-label">{$isLoading ? 'Game Mode' : $_('pong_settings.game_mode.label')}</span>
		<div class="setting-options">
			{#each modeOptions as mode}
				<button
					class="setting-btn"
					class:active={gameMode === mode.key}
					disabled={searching}
					onclick={() => onGameModeChange(mode.key)}
				>
					{mode.label}
				</button>
			{/each}
		</div>
	</div>
	<!-- Player 2 name (local mode only) -->
	{#if gameMode === 'local'}
		<div class="setting-row">
			<span class="setting-label">{$isLoading ? 'Player 2 Name' : $_('common.player2')}</span>
			<input
				class="name-input"
				type="text"
				placeholder={$isLoading ? 'Player 2' : $_('pong_settings.game_mode.guest')}
				maxlength="100"
				value={player2Name}
				oninput={(e) => onPlayer2NameChange(e.currentTarget.value)}
			/>
		</div>
	{/if}
	<!-- Computer difficulty (computer mode only) -->
	{#if gameMode === 'computer'}
		<div class="setting-row">
			<span class="setting-label">Difficulty</span>
			<div class="setting-options">
				{#each difficultyOptions as diff}
					<button
						class="setting-btn"
						class:active={difficulty === diff.key}
						onclick={() => onDifficultyChange(diff.key)}
					>
						{diff.label}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Points to win -->
	<div class="setting-row">
		<span class="setting-label">{$isLoading ? 'Points to Win' : $_('pong_settings.win_score.label')}</span>
		<div class="setting-options">
			{#each pointOptions as points}
				<button
					class="setting-btn"
					class:active={winScore === points}
					disabled={settingsLocked}
					onclick={() => onWinScoreChange(points)}
				>
					{points}
				</button>
			{/each}
		</div>
	</div>

	<!-- Ball speed -->
	<div class="setting-row">
		<span class="setting-label">{$isLoading ? 'Ball Speed' : $_('pong_settings.ball_speed.label')}</span>
		<div class="setting-options">
			{#each speedOptions as preset}
				<button
					class="setting-btn"
					class:active={speedPreset === preset.key}
					disabled={settingsLocked}
					onclick={() => onSpeedChange(preset.key)}
				>
					{preset.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Court theme -->
	<div class="setting-row">
		<span class="setting-label">Court theme</span>
		<div class="setting-options theme-options">
			{#each themeOptions as t}
				<button
					class="theme-dot"
					class:active={courtTheme === t.key}
					style="--dot-color: {t.color}"
					disabled={settingsLocked}
					onclick={() => onThemeChange(t.key)}
					title={t.label}
				></button>
			{/each}
		</div>
	</div>

	<!-- Power-ups (local/computer only) -->
	{#if gameMode !== 'online'}
		<div class="setting-row">
			<span class="setting-label">Power-ups</span>
			<div class="setting-options">
				<button
					class="setting-btn"
					class:active={!powerUpsEnabled}
					onclick={() => onPowerUpsChange(false)}
				>
					OFF
				</button>
				<button
					class="setting-btn"
					class:active={powerUpsEnabled}
					onclick={() => onPowerUpsChange(true)}
				>
					ON
				</button>
			</div>
		</div>
	{/if}

	{#if gameMode !== 'online'}
		<!-- Start button (local/computer modes) -->
		<div class="start-section">
			<button class="start-btn" onclick={() => onStartGame?.()}>
				▶ START GAME
			</button>
		</div>

	<!-- Matchmaking (online mode only) -->
	<!-- {:else}
		<div class="matchmaking-section">
			{#if searching}
				<div class="matchmaking-status">
					<div class="searching-animation">
						<span class="dot"></span>
						<span class="dot"></span>
						<span class="dot"></span>
					</div>
					<p class="searching-text">Searching for opponent...</p>
					{#if queuePosition > 0}
						<p class="queue-text">Position in queue: {queuePosition}</p>
					{/if}
					<button class="cancel-btn" onclick={cancelSearch}>Cancel</button>
				</div>
			{:else}
				<button class="find-match-btn" onclick={findMatch}>Find Match</button>
			{/if}
		</div> -->
	{/if}
</div>

<style>
	.settings-panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.5rem;
		border-radius: 1rem;
		background: linear-gradient(135deg, rgba(22, 22, 58, 0.8), rgba(16, 16, 42, 0.9));
		backdrop-filter: blur(20px);
		/* background: rgba(255, 255, 255, 0.03); */
		border: 1px solid rgba(255, 255, 255, 0.06);
		width: 100%;
		max-width: 500px;
		position: relative;
		overflow: hidden;
	}

	/* Top accent line */
	.accent-line {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--accent, #ff6b9d), transparent);
		opacity: 0.6;
	}

	/* Card title with dot */
	.card-title {
		font-family: 'Courier New', monospace;
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--accent, #ff6b9d);
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.title-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--accent, #ff6b9d);
		box-shadow: 0 0 8px rgba(255, 107, 157, 0.6);
		flex-shrink: 0;
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0;
	}

	.setting-row + .setting-row {
		border-top: 1px solid rgba(255, 255, 255, 0.04);
	}

	.setting-label {
		color: #9ca3af;
		font-size: 0.85rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.setting-options {
		display: flex;
		gap: 0.3rem;
		background: rgba(0, 0, 0, 0.3);
		padding: 0.2rem;
		border-radius: 0.5rem;

	}

	.setting-btn {
		padding: 0.35rem 0.75rem;
		border-radius: 0.5rem;
		border: none;
		background: transparent;
		color: #6b7280;
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.2s;
	}

	.setting-btn:hover:not(:disabled) {
		color: #d1d5db;
	}

	.setting-btn.active {
		background: linear-gradient(135deg, var(--accent, #ff6b9d), #e84393);
		color: #fff;
		font-weight: 600;
		box-shadow: 0 2px 12px rgba(255, 107, 157, 0.25);
	}

	.setting-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.name-input {
		padding: 0.4rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.3);
		color: #d1d5db;
		font-size: 0.8rem;
		font-family: inherit;
		width: 160px;
		outline: none;
		transition: border-color 0.15s;
	}

	.name-input:focus {
		border-color: rgba(255, 107, 157, 0.4);
		box-shadow: 0 0 12px rgba(255, 107, 157, 0.08);
	}

	.name-input::placeholder {
		color: #4b5563;
	}

	/* ── Start button ── */
	.start-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.04);
		margin-top: 0.25rem;
	}

	.start-btn {
		position: relative;
		width: 100%;
		padding: 0.8rem 2rem;
		border: none;
		border-radius: 0.65rem;
		background: linear-gradient(135deg, var(--accent, #ff6b9d), #e84393);
		color: #fff;
		font-family: 'Press Start 2P', cursive;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.3s;
		box-shadow: 0 4px 20px rgba(255, 107, 157, 0.3);
		letter-spacing: 0.05em;
	}

	.start-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 30px rgba(255, 107, 157, 0.45);
	}

	.start-btn:active {
		transform: translateY(0);
		box-shadow: 0 2px 10px rgba(255, 107, 157, 0.3);
	}

	/* .start-hint {
		font-family: 'Courier New', monospace;
		font-size: 0.6rem;
		color: #6b7280;
		margin-top: 0.6rem;
		letter-spacing: 0.1em;
		animation: pulse-hint 2s ease-in-out infinite;
	} */

	/* ── Matchmaking ──────────────────────────────────────── */
	/* .matchmaking-section { */
		/* display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		margin-top: 0.25rem;
	}

	.find-match-btn {
		padding: 0.8rem 2rem;
		border-radius: 0.65rem;
		border: 1px solid rgba(255, 107, 157, 0.4);
		background: rgba(255, 107, 157, 0.15);
		color: #ff6b9d;
		font-size: 0.9rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		width: 100%;
	}

	.find-match-btn:hover {
		background: rgba(255, 107, 157, 0.25);
		border-color: rgba(255, 107, 157, 0.6);
	}

	.matchmaking-status {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0;
		width: 100%;
	}

	.searching-animation {
		display: flex;
		gap: 0.35rem;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #ff6b9d;
		animation: pulse 1.4s ease-in-out infinite;
	}

	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}

	.dot:nth-child(3) {
		animation-delay: 0.4s;
	} */

	@keyframes pulse {
		0%, 80%, 100% {
			opacity: 0.3;
			transform: scale(0.8);
		}
		40% {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* .searching-text {
		color: #9ca3af;
		font-size: 0.85rem;
		margin: 0;
	}

	.queue-text {
		color: #6b7280;
		font-size: 0.75rem;
		margin: 0;
	}

	.cancel-btn {
		padding: 0.4rem 1.25rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: transparent;
		color: #9ca3af;
		font-size: 0.8rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.cancel-btn:hover {
		border-color: rgba(255, 255, 255, 0.25);
		color: #d1d5db;
	} */

	/* ── Theme dots ── */
	.theme-options {
		gap: 0.5rem !important;
		background: none !important;
		padding: 0 !important;
	}

	.theme-dot {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2px solid transparent;
		background: var(--dot-color);
		cursor: pointer;
		transition: all 0.2s;
		padding: 0;
		box-shadow: 0 0 8px color-mix(in srgb, var(--dot-color) 40%, transparent);
	}

	.theme-dot:hover:not(:disabled) {
		transform: scale(1.15);
		box-shadow: 0 0 14px color-mix(in srgb, var(--dot-color) 60%, transparent);
	}

	.theme-dot.active {
		border-color: var(--dot-color);
		box-shadow: 0 0 16px color-mix(in srgb, var(--dot-color) 50%, transparent),
		            inset 0 0 4px rgba(255, 255, 255, 0.3);
		transform: scale(1.1);
	}

	.theme-dot:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>