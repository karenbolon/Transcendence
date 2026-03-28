<!-- ═══════════════════════════════════════════════════════════════════════════
     🌐 ONLINE PLAY PANEL — src/lib/component/pong/FindMatch.svelte

     Replaces the settings panel when "Online" mode is selected.

     Sections:
       1. Quick Play — Random / My Prefs / Custom → "Find Match"
       2. Friends looking to play — Accept (in queue) or Challenge (online)
       3. Open queue — strangers waiting, Join button

     Props:
       friends       — online friends list
       queuePlayers  — strangers in the public queue
       userPrefs     — logged-in user's default settings
       onFindMatch   — callback with selected settings
       onAcceptMatch — callback when accepting a friend's/stranger's game
       onChallenge   — callback when challenging an online friend (not in queue)
═══════════════════════════════════════════════════════════════════════════ -->
<script lang="ts">
	import type { SpeedPreset } from '$lib/game/gameEngine';
	import MatchmakingInfo from '$lib/component/matchmaking/MatchmakingInfo.svelte';

	let showInfo = $state(false);

	type Props = {
		friends?: any[];
		queuePlayers?: any[];
		playersOnline?: number;
		userPrefs?: { speedPreset: string; winScore: number };
		onFindMatch: (settings: { mode: 'random' | 'prefs' | 'custom'; speedPreset: SpeedPreset; winScore: number }) => void;
		onAcceptMatch: (playerId: number) => void;
		onChallenge: (friend: any, settings: { speedPreset: SpeedPreset; winScore: number }) => void;
		onSavePrefs?: (prefs: { speedPreset: SpeedPreset; winScore: number }) => void;
		searching?: boolean;
		queuePosition?: number;
		searchTime?: number;
		onCancelSearch?: () => void;
	};

	let {
		friends = [],
		queuePlayers = [],
		playersOnline = 0,
		userPrefs = { speedPreset: 'normal', winScore: 5 },
		onFindMatch,
		onAcceptMatch,
		onChallenge,
		onSavePrefs,
		searching = false,
		queuePosition = 0,
		searchTime = 0,
		onCancelSearch,
	}: Props = $props();

	// ── QUICK PLAY STATE ───────────────────────────────────────
	type QuickMode = 'random' | 'prefs' | 'custom';
	let quickMode = $state<QuickMode>('prefs');
	let editingPrefs = $state(false);

	// Custom settings (for custom mode only)
	let customSpeed = $state<SpeedPreset>('normal');
	let customScore = $state(5);

	// The active settings based on current mode
	function getActiveSettings(): { speedPreset: SpeedPreset; winScore: number } {
		if (quickMode === 'prefs') {
			return { speedPreset: userPrefs.speedPreset as SpeedPreset, winScore: userPrefs.winScore };
		}
		return { speedPreset: customSpeed, winScore: customScore };
	}

	// ── HANDLERS ───────────────────────────────────────────────
	function handleFindMatch() {
		if (quickMode === 'random') {
			onFindMatch({ mode: 'random', speedPreset: 'normal', winScore: 5 });
		} else {
			const s = getActiveSettings();
			onFindMatch({ mode: quickMode, speedPreset: s.speedPreset, winScore: s.winScore });
		}
	}

	// Helpers
	function speedEmoji(preset: string): string {
		switch (preset) {
			case 'chill': return '🐢';
			case 'normal': return '🏓';
			case 'fast': return '🔥';
			default: return '🏓';
		}
	}

	function capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	const speedOptions: { value: SpeedPreset; emoji: string; label: string }[] = [
		{ value: 'chill', emoji: '🐢', label: 'Chill' },
		{ value: 'normal', emoji: '🏓', label: 'Normal' },
		{ value: 'fast', emoji: '🔥', label: 'Fast' },
	];

	const scoreOptions = [3, 5, 7, 11];
</script>

<div class="online-panel">

	<!-- ═══════════════════════════════════════════════
	     QUICK PLAY
	═══════════════════════════════════════════════ -->
	<section class="section">
		<div class="section-header">
			<div class="section-title-row">
				<div>
					<h2 class="section-title">Quick play</h2>
					<p class="section-sub">Jump into a game instantly</p>
				</div>
				<button class="info-btn" onclick={() => showInfo = true} aria-label="How matchmaking works">?</button>
			</div>
			<div class="online-indicator">
				<span class="online-dot-pulse"></span>
				<span class="online-count">{playersOnline} players online</span>
			</div>
		</div>

		{#if showInfo}
			<MatchmakingInfo onClose={() => showInfo = false} />
		{/if}

		{#if searching}
			<div class="searching-state">
				<div class="searching-indicator">
					<span class="searching-dot-pulse"></span>
					<span class="searching-text">Searching for opponent...</span>
				</div>
				<div class="searching-stats">
					<div class="search-stat">
						<span class="search-stat-value">{Math.floor(searchTime / 60)}:{String(searchTime % 60).padStart(2, '0')}</span>
						<span class="search-stat-label">Time</span>
					</div>
					<div class="search-stat">
						<span class="search-stat-value">#{queuePosition}</span>
						<span class="search-stat-label">Position</span>
					</div>
					<div class="search-stat">
						<span class="search-stat-value">{playersOnline}</span>
						<span class="search-stat-label">In queue</span>
					</div>
				</div>
				{#if onCancelSearch}
					<button class="cancel-search-btn" onclick={onCancelSearch}>
						Cancel search
					</button>
				{/if}
			</div>
		{:else}
			<!-- Three mode cards -->
			<div class="mode-grid">
				<button
					class="mode-card"
					class:selected={quickMode === 'random'}
					onclick={() => quickMode = 'random'}
				>
					<span class="mode-emoji">🎲</span>
					<span class="mode-name">Random</span>
					<span class="mode-desc">Match with anyone</span>
					<span class="mode-detail">Random settings</span>
				</button>

				<button
					class="mode-card"
					class:selected={quickMode === 'prefs'}
					onclick={() => {
						quickMode = 'prefs';
						editingPrefs = false;
					}}
				>
					<span class="mode-emoji">⚙️</span>
					<span class="mode-name">My preferences</span>
					<span class="mode-desc">Match your prefs</span>
					<span class="mode-detail">{speedEmoji(userPrefs.speedPreset)} {capitalize(userPrefs.speedPreset)} · First to {userPrefs.winScore}</span>
				</button>

				<button
					class="mode-card"
					class:selected={quickMode === 'custom'}
					onclick={() => quickMode = 'custom'}
				>
					<span class="mode-emoji">🎯</span>
					<span class="mode-name">Custom</span>
					<span class="mode-desc">Pick your rules</span>
					<span class="mode-detail">Choose speed + score</span>
				</button>
			</div>

			<!-- Edit prefs button (only in prefs mode) -->
			{#if quickMode === 'prefs' && onSavePrefs}
				{#if !editingPrefs}
					<button class="edit-prefs-btn" onclick={() => {
						editingPrefs = true;
						customSpeed = userPrefs.speedPreset as SpeedPreset;
						customScore = userPrefs.winScore;
					}}>
						Edit preferences
					</button>
				{:else}
					<div class="custom-settings">
						<div class="custom-group">
							<span class="custom-label">Speed</span>
							<div class="custom-options">
								{#each speedOptions as opt}
									<button
										class="custom-opt"
										class:active={customSpeed === opt.value}
										onclick={() => customSpeed = opt.value}
									>
										{opt.emoji} {opt.label}
									</button>
								{/each}
							</div>
						</div>
						<div class="custom-group">
							<span class="custom-label">First to</span>
							<div class="custom-options">
								{#each scoreOptions as score}
									<button
										class="custom-opt"
										class:active={customScore === score}
										onclick={() => customScore = score}
									>
										{score}
									</button>
								{/each}
							</div>
						</div>
					</div>
					<div class="edit-prefs-actions">
						<button class="save-prefs-btn" onclick={() => {
							onSavePrefs?.({ speedPreset: customSpeed, winScore: customScore });
							editingPrefs = false;
						}}>
							Save
						</button>
						<button class="cancel-prefs-btn" onclick={() => editingPrefs = false}>
							Cancel
						</button>
					</div>
				{/if}
			{/if}

			<!-- Settings picker (custom mode) -->
			{#if quickMode === 'custom'}
				<div class="custom-settings">
					<div class="custom-group">
						<span class="custom-label">Speed</span>
						<div class="custom-options">
							{#each speedOptions as opt}
								<button
									class="custom-opt"
									class:active={customSpeed === opt.value}
									onclick={() => customSpeed = opt.value}
								>
									{opt.emoji} {opt.label}
								</button>
							{/each}
						</div>
					</div>
					<div class="custom-group">
						<span class="custom-label">First to</span>
						<div class="custom-options">
							{#each scoreOptions as score}
								<button
									class="custom-opt"
									class:active={customScore === score}
									onclick={() => customScore = score}
								>
									{score}
								</button>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<!-- Find Match button -->
			<button class="find-match-btn" onclick={handleFindMatch}>
				🎮 Find match
			</button>
		{/if}
	</section>


</div>

<style>
	.online-panel {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* ═════════════════════════════════════════════════
	   SECTIONS
	   ═════════════════════════════════════════════════ */
	.section {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.section-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.section-title-row {
		display: flex;
		align-items: flex-start;
		gap: 0.4rem;
	}

	.section-title {
		font-size: 1rem;
		font-weight: 700;
		color: #f3f4f6;
		margin: 0;
	}

	.section-sub {
		font-size: 0.75rem;
		color: #6b7280;
		margin: 0.1rem 0 0;
	}

	.info-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		color: #6b7280;
		font-size: 0.7rem;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		padding: 0;
		margin-top: 0.1rem;
		flex-shrink: 0;
	}

	.info-btn:hover {
		border-color: rgba(255, 107, 157, 0.3);
		color: #ff6b9d;
		background: rgba(255, 107, 157, 0.05);
	}

	/* .section-count {
		font-size: 0.7rem;
		color: #6b7280;
	} */

	/* Online indicator */
	.online-indicator {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.online-dot-pulse {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #4ade80;
		animation: blink 2s ease infinite;
	}

	.online-count {
		font-size: 0.75rem;
		color: #6b7280;
	}

	/* ═════════════════════════════════════════════════
	   MODE CARDS (Quick Play)
	   ═════════════════════════════════════════════════ */
	.mode-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
	}

	.mode-card {
		padding: 0.85rem 0.6rem;
		border-radius: 0.6rem;
		background: rgba(255, 255, 255, 0.025);
		border: 1px solid rgba(255, 255, 255, 0.06);
		cursor: pointer;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		font-family: inherit;
		transition: all 0.15s;
	}

	.mode-card:hover {
		border-color: rgba(255, 107, 157, 0.25);
		background: rgba(255, 107, 157, 0.03);
	}

	.mode-card.selected {
		border-color: #ff6b9d;
		background: rgba(255, 107, 157, 0.06);
	}

	.mode-emoji { font-size: 1.25rem; margin-bottom: 0.15rem; }
	.mode-name { font-size: 0.82rem; font-weight: 600; color: #f3f4f6; }
	.mode-desc { font-size: 0.7rem; color: #6b7280; }
	.mode-detail { font-size: 0.65rem; color: #9ca3af; margin-top: 0.1rem; }

	.mode-card.selected .mode-name { color: #ff6b9d; }

	/* ═════════════════════════════════════════════════
	   CUSTOM SETTINGS
	   ═════════════════════════════════════════════════ */
	.custom-settings {
		display: flex;
		gap: 1.25rem;
		padding: 0.85rem 1rem;
		border-radius: 0.6rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
		flex-wrap: wrap;
	}

	.custom-group {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.custom-label {
		font-size: 0.65rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.custom-options {
		display: flex;
		gap: 0.25rem;
	}

	.custom-opt {
		padding: 0.35rem 0.7rem;
		border-radius: 0.4rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.02);
		color: #9ca3af;
		font-size: 0.75rem;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.custom-opt:hover {
		border-color: rgba(255, 255, 255, 0.15);
		color: #d1d5db;
	}

	.custom-opt.active {
		border-color: #ff6b9d;
		background: rgba(255, 107, 157, 0.08);
		color: #ff6b9d;
	}

	/* ═════════════════════════════════════════════════
	   FIND MATCH BUTTON
	   ═════════════════════════════════════════════════ */
	.find-match-btn {
		width: 100%;
		padding: 0.75rem;
		border-radius: 0.6rem;
		background: #ff6b9d;
		color: #fff;
		border: none;
		font-size: 0.9rem;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		transition: all 0.15s;
	}

	.find-match-btn:hover {
		background: #ff85b1;
		transform: scale(1.01);
	}

	/* ═════════════════════════════════════════════════
	   SAVE PREFS BUTTON
	   ═════════════════════════════════════════════════ */
	.save-prefs-btn {
		align-self: flex-end;
		padding: 0.3rem 0.75rem;
		border-radius: 0.4rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		color: #9ca3af;
		font-size: 0.7rem;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.save-prefs-btn:hover {
		border-color: rgba(74, 222, 128, 0.3);
		color: #4ade80;
	}

	.edit-prefs-btn {
		padding: 0.3rem 0.75rem;
		border-radius: 0.4rem;
		border: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(255, 255, 255, 0.02);
		color: #6b7280;
		font-size: 0.7rem;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.edit-prefs-btn:hover {
		border-color: rgba(255, 255, 255, 0.12);
		color: #9ca3af;
	}

	.edit-prefs-actions {
		display: flex;
		gap: 0.4rem;
		justify-content: flex-end;
	}

	.cancel-prefs-btn {
		padding: 0.3rem 0.75rem;
		border-radius: 0.4rem;
		border: 1px solid rgba(255, 255, 255, 0.06);
		background: transparent;
		color: #6b7280;
		font-size: 0.7rem;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.cancel-prefs-btn:hover {
		color: #9ca3af;
	}

	/* ═════════════════════════════════════════════════
	   SEARCHING STATE
	   ═════════════════════════════════════════════════ */
	.searching-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem 0;
	}

	.searching-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.searching-dot-pulse {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #ff6b9d;
		animation: blink 2s ease infinite;
	}

	.searching-text {
		font-size: 0.85rem;
		color: #f3f4f6;
		font-weight: 600;
	}

	.searching-stats {
		display: flex;
		gap: 1.5rem;
	}

	.search-stat {
		text-align: center;
	}

	.search-stat-value {
		display: block;
		font-size: 1.1rem;
		font-weight: 700;
		color: #ff6b9d;
		font-variant-numeric: tabular-nums;
	}

	.search-stat-label {
		display: block;
		font-size: 0.65rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-top: 0.1rem;
	}

	.cancel-search-btn {
		padding: 0.5rem 1.5rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		color: #9ca3af;
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.cancel-search-btn:hover {
		border-color: rgba(248, 113, 113, 0.3);
		color: #f87171;
	}

	/* ═════════════════════════════════════════════════
	   ANIMATIONS
	   ═════════════════════════════════════════════════ */
	@keyframes blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	/* ═════════════════════════════════════════════════
	   RESPONSIVE
	   ═════════════════════════════════════════════════ */
	@media (max-width: 500px) {
		.mode-grid {
			grid-template-columns: 1fr;
			gap: 0.4rem;
		}

		.mode-card {
			flex-direction: row;
			text-align: left;
			padding: 0.7rem 0.85rem;
			gap: 0.6rem;
		}

		.mode-emoji { font-size: 1.1rem; margin: 0; }

		.custom-settings {
			flex-direction: column;
			gap: 0.75rem;
		}

		/* .player-row {
			flex-wrap: wrap;
		}

		.queue-badge {
			display: none;
		} */
	}
</style>