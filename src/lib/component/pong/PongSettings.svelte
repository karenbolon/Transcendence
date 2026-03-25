
<script lang="ts">
	import type { SpeedPreset, GameMode } from './gameEngine';
	import ThemePicker from './ThemePicker.svelte';
	import BallSkinPicker from './BallSkinPicker.svelte';
	import EffectsSettings from './EffectsSettings.svelte';
	import SoundSettings from './SoundSettings.svelte';
	import { DEFAULT_EFFECTS_CUSTOM, type EffectsPreset, type EffectsCustom } from './effectsEngine';

	type Props = {
		gameMode: GameMode;
		winScore: number;
		speedPreset: SpeedPreset;
		player2Name: string;
		isLoggedIn?: boolean;
		onGameModeChange: (mode: GameMode) => void;
		onWinScoreChange: (score: number) => void;
		onSpeedChange: (preset: SpeedPreset) => void;
		onPlayer2NameChange: (name: string) => void;
		theme?: string;
		ballSkin?: string;
		effectsPreset?: string;
		soundVolume?: number;
		soundMuted?: boolean;
		onThemeChange?: (id: string) => void;
		onBallSkinChange?: (id: string) => void;
		onEffectsChange?: (preset: string) => void;
		onSoundVolumeChange?: (v: number) => void;
		onSoundMuteChange?: (m: boolean) => void;
		effectsCustom?: EffectsCustom;
		onEffectsCustomChange?: (c: EffectsCustom) => void;
		onSavePreferences?: () => void;
		saveStatus?: 'idle' | 'saving' | 'saved';
		onTabChange?: (tab: 'game' | 'customize') => void;
	};

	let {
		gameMode,
		winScore,
		speedPreset,
		player2Name,
		isLoggedIn = false,
		onGameModeChange,
		onWinScoreChange,
		onSpeedChange,
		onPlayer2NameChange,
		theme = 'classic',
		ballSkin = undefined,
		effectsPreset = undefined,
		soundVolume = 70,
		soundMuted = false,
		onThemeChange = undefined,
		onBallSkinChange = undefined,
		onEffectsChange = undefined,
		onSoundVolumeChange = undefined,
		onSoundMuteChange = undefined,
		effectsCustom = undefined,
		onEffectsCustomChange = undefined,
		onSavePreferences = undefined,
		saveStatus = 'idle',
		onTabChange = undefined,
	}: Props = $props();

	let activeTab = $state<'game' | 'customize'>('game');
	let customizeSubTab = $state<'visual' | 'effects' | 'sound'>('visual');

	const modeOptions = [
		{ key: 'local' as const,    label: '👥 Local PvP'},
		{ key: 'computer' as const, label: '🤖 vs Computer'},
		{ key: 'online' as const,   label: '🌐 Online' },
	];
	const pointOptions = [3, 5, 7, 11];
	const speedOptions = [
		{ key: 'chill' as const,  label: '🐢 Chill' },
		{ key: 'normal' as const, label: '🏓 Normal' },
		{ key: 'fast' as const,   label: '🔥 Fast' },
	];
</script>

<div class="settings-panel">
	<!-- Tab bar -->
	<div class="tab-bar">
		<button class="tab-btn" class:active={activeTab === 'game'} onclick={() => { activeTab = 'game'; onTabChange?.('game'); }}>Game</button>
		<button class="tab-btn" class:active={activeTab === 'customize'} onclick={() => { activeTab = 'customize'; onTabChange?.('customize'); }}>Customize</button>
	</div>

	{#if activeTab === 'game'}
		<!-- Game mode -->
		<div class="setting-row">
			<span class="setting-label">Game mode</span>
			<div class="setting-options">
				{#each modeOptions as mode}
					{@const needsLogin = mode.key === 'online' && !isLoggedIn}
					<button
						class="setting-btn"
						class:active={gameMode === mode.key}
						class:locked={needsLogin}
						disabled={needsLogin}
						title={needsLogin ? 'Log in to play online' : ''}
						onclick={() => onGameModeChange(mode.key)}
					>
						{mode.label}{#if needsLogin} 🔒{/if}
					</button>
				{/each}
			</div>
		</div>
		{#if gameMode !== 'online'}
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
		{/if}
	{:else}
		{#if isLoggedIn}
			<!-- Sub-tabs for Customize -->
			<div class="subtab-bar">
				<button class="subtab-btn" class:active={customizeSubTab === 'visual'} onclick={() => customizeSubTab = 'visual'}>Visual</button>
				<button class="subtab-btn" class:active={customizeSubTab === 'effects'} onclick={() => customizeSubTab = 'effects'}>Effects</button>
				<button class="subtab-btn" class:active={customizeSubTab === 'sound'} onclick={() => customizeSubTab = 'sound'}>Sound</button>
			</div>

			{#if customizeSubTab === 'visual'}
				<div class="customize-section">
					<span class="section-label">Theme</span>
					<ThemePicker selectedThemeId={theme ?? 'classic'} onThemeChange={(id) => onThemeChange?.(id)} />
				</div>

				<div class="customize-section">
					<span class="section-label">Ball Skin</span>
					<BallSkinPicker selectedSkinId={ballSkin ?? 'default'} themeId={theme ?? 'classic'} onSkinChange={(id) => onBallSkinChange?.(id)} />
				</div>
			{:else if customizeSubTab === 'effects'}
				<div class="customize-section">
					<span class="section-label">Effects Preset</span>
					<EffectsSettings
						preset={(effectsPreset ?? 'arcade') as EffectsPreset}
						customConfig={effectsCustom ?? DEFAULT_EFFECTS_CUSTOM}
						onPresetChange={(p) => onEffectsChange?.(p)}
						onCustomChange={(c) => onEffectsCustomChange?.(c)}
					/>
				</div>
			{:else if customizeSubTab === 'sound'}
				<div class="customize-section">
					<span class="section-label">Volume & Mute</span>
					<SoundSettings
						volume={soundVolume ?? 70}
						muted={soundMuted ?? false}
						onVolumeChange={(v) => onSoundVolumeChange?.(v)}
						onMuteChange={(m) => onSoundMuteChange?.(m)}
					/>
				</div>
			{/if}

			<button class="save-btn" class:saved={saveStatus === 'saved'} onclick={() => onSavePreferences?.()}>
				{#if saveStatus === 'saving'}
					Saving...
				{:else if saveStatus === 'saved'}
					Saved
				{:else}
					Save Preferences
				{/if}
			</button>
		{:else}
			<div class="login-gate">
				<p>Log in to unlock customization</p>
			</div>
		{/if}
	{/if}
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
		width: 480px;
		max-width: 100%;
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

	.setting-btn.locked {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.setting-btn.locked:hover {
		border-color: rgba(255, 255, 255, 0.08);
		color: #6b7280;
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

	/* Main tabs */
	.tab-bar {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.5rem;
		border-bottom: 1px solid rgba(255,255,255,0.06);
		padding-bottom: 0.5rem;
	}
	.tab-btn {
		padding: 0.3rem 0.75rem;
		border-radius: 0.4rem;
		border: none;
		background: transparent;
		color: #6b7280;
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}
	.tab-btn:hover { color: #d1d5db; }
	.tab-btn.active {
		background: rgba(255,107,157,0.15);
		color: #ff6b9d;
		font-weight: 600;
	}

	/* Customize sub-tabs */
	.subtab-bar {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.25rem;
	}
	.subtab-btn {
		padding: 0.25rem 0.6rem;
		border-radius: 0.4rem;
		border: 1px solid rgba(255,255,255,0.06);
		background: transparent;
		color: #6b7280;
		font-size: 0.7rem;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}
	.subtab-btn:hover { color: #d1d5db; border-color: rgba(255,107,157,0.2); }
	.subtab-btn.active {
		background: rgba(255,107,157,0.1);
		border-color: rgba(255,107,157,0.3);
		color: #ff6b9d;
		font-weight: 600;
	}

	.login-gate {
		text-align: center;
		padding: 1.5rem;
		color: #6b7280;
		font-size: 0.85rem;
	}
	.customize-section {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.section-label {
		font-size: 0.7rem;
		color: #ff6b9d;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 1px;
	}
	.save-btn {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255,107,157,0.4);
		background: rgba(255,107,157,0.15);
		color: #ff6b9d;
		font-size: 0.85rem;
		font-family: inherit;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		margin-top: 0.5rem;
	}
	.save-btn:hover {
		background: rgba(255,107,157,0.25);
		border-color: rgba(255,107,157,0.6);
	}
	.save-btn.saved {
		background: rgba(74,222,128,0.15);
		border-color: rgba(74,222,128,0.4);
		color: #4ade80;
	}
</style>
