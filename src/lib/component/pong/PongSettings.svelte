
<script lang="ts">
	import type { SpeedPreset, GameMode } from './gameEngine';

	type Props = {
		gameMode: GameMode;
		winScore: number;
		speedPreset: SpeedPreset;
		player2Name: string;
		onGameModeChange: (mode: GameMode) => void;
		onWinScoreChange: (score: number) => void;
		onSpeedChange: (preset: SpeedPreset) => void;
		onPlayer2NameChange: (name: string) => void;
	};

	let { gameMode, winScore, speedPreset, player2Name, onGameModeChange, onWinScoreChange, onSpeedChange, onPlayer2NameChange }: Props = $props();

	const modeOptions: { key: GameMode; label: string }[] = [
		{ key: 'local',    label: '👥 Local PvP' },
		{ key: 'computer', label: '🤖 vs Computer' },
	];
	// Point options and speed presets defined here (display data only)
	const pointOptions = [3, 5, 7, 11];
	const speedOptions: { key: SpeedPreset; label: string }[] = [
		{ key: 'chill',  label: '🐢 Chill' },
		{ key: 'normal', label: '🏓 Normal' },
		{ key: 'fast',   label: '🔥 Fast' },
	];
</script>

<div class="settings-panel">
	<!-- Game mode -->
	<div class="setting-row">
		<span class="setting-label">Game mode</span>
		<div class="setting-options">
			{#each modeOptions as mode}
				<button
					class="setting-btn"
					class:active={gameMode === mode.key}
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
			<span class="setting-label">Player 2</span>
			<input
				class="name-input"
				type="text"
				placeholder="Guest"
				maxlength="100"
				value={player2Name}
				oninput={(e) => onPlayer2NameChange(e.currentTarget.value)}
			/>
		</div>
	{/if}

	<!-- Points to win -->
	<div class="setting-row">
		<span class="setting-label">Points to win</span>
		<div class="setting-options">
			{#each pointOptions as points}
				<button
					class="setting-btn"
					class:active={winScore === points}
					onclick={() => onWinScoreChange(points)}
				>
					{points}
				</button>
			{/each}
		</div>
	</div>

	<!-- Ball speed -->
	<div class="setting-row">
		<span class="setting-label">Ball speed</span>
		<div class="setting-options">
			{#each speedOptions as preset}
				<button
					class="setting-btn"
					class:active={speedPreset === preset.key}
					onclick={() => onSpeedChange(preset.key)}
				>
					{preset.label}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.settings-panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		width: 100%;
		max-width: 500px;
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.setting-label {
		color: #9ca3af;
		font-size: 0.85rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.setting-options {
		display: flex;
		gap: 0.4rem;
	}

	.setting-btn {
		padding: 0.35rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		color: #6b7280;
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.setting-btn:hover {
		border-color: rgba(255, 107, 157, 0.3);
		color: #d1d5db;
	}

	.setting-btn.active {
		background: rgba(255, 107, 157, 0.15);
		border-color: rgba(255, 107, 157, 0.4);
		color: #ff6b9d;
		font-weight: 600;
	}

	.name-input {
		padding: 0.35rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		color: #d1d5db;
		font-size: 0.8rem;
		font-family: inherit;
		width: 160px;
		outline: none;
		transition: border-color 0.15s;
	}

	.name-input:focus {
		border-color: rgba(255, 107, 157, 0.4);
	}

	.name-input::placeholder {
		color: #4b5563;
	}
</style>