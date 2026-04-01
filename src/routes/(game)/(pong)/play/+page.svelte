<script lang="ts">
	import { page } from "$app/stores";
	import PongGame from "$lib/component/pong/PongGame.svelte";
	import PongSettings from "$lib/component/pong/PongSettings.svelte";
	import PongControls from "$lib/component/pong/PongControls.svelte";
	import LevelUpModal from "$lib/component/progression/LevelUpModal.svelte";
	import type { XpBonus, NewAchievement } from '$lib/types/progression';
	import AmbientBackground from "$lib/component/effect/AmbientBackground.svelte";
	import Starfield from "$lib/component/effect/Starfield.svelte";
	import Aurora from "$lib/component/effect/Aurora.svelte";
	import Scanlines from "$lib/component/effect/Scanlines.svelte";
	import NoiseGrain from "$lib/component/effect/NoiseGrain.svelte";
	import FindMatch from "$lib/component/matchmaking/FindMatch.svelte";
	import FriendsList from "$lib/component/matchmaking/FriendsList.svelte";
	import QueueList from "$lib/component/matchmaking/QueueList.svelte";
	import QueueSearchBanner from "$lib/component/matchmaking/QueueSearchBanner.svelte";
	import MatchFoundModal from "$lib/component/matchmaking/MatchFoundModal.svelte";
	import LeaveQueueModal from "$lib/component/matchmaking/LeaveQueueModal.svelte";
	import { goto, replaceState, beforeNavigate, invalidateAll } from "$app/navigation";
	import { getSocket, connectSocket } from "$lib/stores/socket.svelte";
	import { setWaiting, setGameStart, setQueuedSettings } from "$lib/stores/matchmaking.svelte";
	import { toast } from "$lib/stores/toast.svelte";
	import { onMount } from "svelte";
	import {
		SPEED_CONFIGS,
		pauseGame,
		resumeGame,
		type SpeedPreset,
		type GameMode,
		type GameSettings,
		type AiDifficulty,
		aiOpponentDisplayName,
	} from "$lib/game/gameEngine";
	import { mergePreferences, debouncedSavePreferences } from '$lib/game/preferences';
	import { getTheme } from '$lib/game/themes';
	import { getSoundEngine } from '$lib/game/soundEngine';
	import { DEFAULT_EFFECTS_CUSTOM } from '$lib/game/effectsEngine';

	let layoutData = $derived($page.data);
	let isLoggedIn = $derived(!!layoutData?.user);

	let userPrefs = $derived(layoutData?.user?.game_preferences ?? { speedPreset: 'normal', winScore: 5 });

	let prefs = $state(mergePreferences($page.data?.user?.game_preferences as any));

	$effect(() => {
		const se = getSoundEngine();
		se.setVolume(prefs.soundVolume / 100);
		se.setMuted(prefs.soundMuted);
	});

	let prefsSaveStatus = $state<'idle' | 'saving' | 'saved'>('idle');

	async function savePreferences() {
		prefsSaveStatus = 'saving';
		try {
			await fetch('/api/settings/game-preferences', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(prefs),
			});
			prefsSaveStatus = 'saved';
			setTimeout(() => { prefsSaveStatus = 'idle'; }, 2000);
		} catch {
			prefsSaveStatus = 'idle';
		}
	}

	// ── Real-time friends/queue state for FindMatch ──
	type OnlineFriend = {
		id: number;
		username: string;
		displayName: string | null;
		avatarUrl: string | null;
		isOnline: boolean;
		inQueue: boolean;
		queueSettings?: { speedPreset: string; winScore: number; powerUps?: boolean };
	};
	type QueuePlayer = {
		id: number;
		username: string;
		displayName: string | null;
		avatarUrl: string | null;
		wins: number;
		queueSettings: { speedPreset: string; winScore: number; powerUps?: boolean };
	};
	let onlineFriends = $state<OnlineFriend[]>([]);
	let queuePlayers = $state<QueuePlayer[]>([]);
	let queueSize = $state(0);

	// ── Queue searching state (stay on play page) ──
	let isSearching = $state(false);
	let searchTime = $state(0);
	let queuePosition = $state(0);
	let searchInterval: ReturnType<typeof setInterval> | null = null;
	let searchSettings = $state<{ mode: 'random' | 'prefs' | 'custom'; speedPreset: string; winScore: number; powerUps: boolean } | null>(null);

	// Client-side safety: auto-cancel at 5 minutes if server event is delayed
	$effect(() => {
		if (isSearching && searchTime >= 300) {
			cancelSearch();
			toast.info('Queue expired', 'No match found after 5 minutes. Try again!');
		}
	});

	// Match found state (shown as modal during local/computer game)
	let matchFound = $state(false);
	let matchData = $state<{ roomId: string; player1: any; player2: any; settings: any } | null>(null);

	// Track queue status separately so it doesn't cause re-render loops
	let friendQueueMap = $state(new Map<number, { speedPreset: string; winScore: number } | undefined>());

	// Keep friends in sync with layout data (auto-updates on invalidateAll)
	let baseFriends = $derived((layoutData?.friends ?? []).map((f: any) => ({
		id: f.id as number,
		username: f.username as string,
		displayName: (f.name ?? f.username) as string | null,
		avatarUrl: f.avatar_url as string | null,
		isOnline: (f.is_online ?? false) as boolean,
	})));

	$effect(() => {
		onlineFriends = baseFriends.map((f: typeof baseFriends[number]) => ({
			...f,
			inQueue: friendQueueMap.has(f.id),
			queueSettings: friendQueueMap.get(f.id),
		}));
	});

	function fetchQueueStatus() {
		const socket = getSocket();
		if (!socket?.connected) return;

		socket.emit('game:queue-status', (data: any) => {
			queueSize = data.queueSize ?? 0;
			queuePlayers = data.queuePlayers ?? [];
			if (isSearching) queuePosition = data.myPosition ?? 0;
			// Update friends' queue status via the map (triggers $effect to rebuild onlineFriends)
			friendQueueMap = new Map<number, { speedPreset: string; winScore: number } | undefined>(
				(data.friendsInQueue ?? []).map((f: any) => [f.userId, f.settings])
			);
		});
	}

	// ── Socket setup for online matchmaking ──
	onMount(() => {
		if (!isLoggedIn) return;
		connectSocket();

		const socket = getSocket();
		if (!socket) return;

		// Fetch initial queue status — also restore searching state if we're in the queue
		socket.emit('game:queue-status', (data: any) => {
			queueSize = data.queueSize ?? 0;
			queuePlayers = data.queuePlayers ?? [];
			const myPos = data.myPosition ?? 0;
			if (myPos > 0 && !isSearching) {
				// We're in the queue (e.g. re-queued after cancelled game) — restore searching state
				isSearching = true;
				queuePosition = myPos;
				searchTime = 0;
				if (searchInterval) clearInterval(searchInterval);
				searchInterval = setInterval(() => { searchTime += 1; }, 1000);
				if (gameMode !== 'online') gameMode = 'online';
			} else if (isSearching) {
				queuePosition = myPos;
			}
			friendQueueMap = new Map<number, { speedPreset: string; winScore: number } | undefined>(
				(data.friendsInQueue ?? []).map((f: any) => [f.userId, f.settings])
			);
		});

		function handleGameStart(startData: { roomId: string; player1: any; player2: any; settings: any }) {
			// Stop the search timer
			if (searchInterval) { clearInterval(searchInterval); searchInterval = null; }
			isSearching = false;

			// Save game start data so room page can access player info
			setGameStart(startData);

			if (gameMode === 'online' || gamePhase === 'menu') {
				// On online tab or at menu — go directly to game
				goto(`/play/online/${startData.roomId}`);
			} else {
				// Playing local/computer — pause game and show match found modal
				matchFound = true;
				matchData = startData;
				if (pongGame) pauseGame(pongGame.getGameState());
			}
		}

		function handleFriendOnline(data: { userId: number }) {
			onlineFriends = onlineFriends.map((friend) =>
				friend.id === data.userId ? { ...friend, isOnline: true } : friend
			);
			invalidateAll();
		}

		function handleFriendOffline(data: { userId: number }) {
			onlineFriends = onlineFriends.map((friend) =>
				friend.id === data.userId
					? { ...friend, isOnline: false, inQueue: false, queueSettings: undefined }
					: friend
			);
			const newMap = new Map(friendQueueMap);
			newMap.delete(data.userId);
			friendQueueMap = newMap;
			invalidateAll();
		}

		function handleQueueFriendUpdate(data: { userId: number; username: string; mode: string | null; action: string }) {
			if (data.action === 'joined') {
				const newMap = new Map(friendQueueMap);
				newMap.set(data.userId, undefined);
				friendQueueMap = newMap;
			} else if (data.action === 'left' || data.action === 'matched') {
				const newMap = new Map(friendQueueMap);
				newMap.delete(data.userId);
				friendQueueMap = newMap;
			}
			fetchQueueStatus();
		}

		// Server re-queued us (e.g. opponent cancelled before game started)
		function handleQueueJoined(data: { queueSize: number; position: number }) {
			if (!isSearching) {
				isSearching = true;
				searchTime = 0;
				if (searchInterval) clearInterval(searchInterval);
				searchInterval = setInterval(() => { searchTime += 1; }, 1000);
			}
			queuePosition = data.position ?? 0;
			queueSize = data.queueSize ?? 0;
			// Switch to online tab so user sees the searching state
			if (gameMode !== 'online') {
				gameMode = 'online';
			}
		}

		function handleQueueExpired() {
			isSearching = false;
			if (searchInterval) { clearInterval(searchInterval); searchInterval = null; }
			searchTime = 0;
			queuePosition = 0;
			searchSettings = null;
			toast.info('Queue expired', 'No match found after 5 minutes. Try again!');
		}

		// Poll queue status every 5s to pick up strangers joining/leaving
		const pollInterval = setInterval(fetchQueueStatus, 5000);

		socket.on('game:start', handleGameStart);
		socket.on('game:queue-joined', handleQueueJoined);
		socket.on('game:queue-expired', handleQueueExpired);
		socket.on('friend:online', handleFriendOnline);
		socket.on('friend:offline', handleFriendOffline);
		socket.on('game:queue-friend-update', handleQueueFriendUpdate);

		return () => {
			clearInterval(pollInterval);
			if (searchInterval) clearInterval(searchInterval);
			socket.off('game:start', handleGameStart);
			socket.off('game:queue-joined', handleQueueJoined);
			socket.off('game:queue-expired', handleQueueExpired);
			socket.off('friend:online', handleFriendOnline);
			socket.off('friend:offline', handleFriendOffline);
			socket.off('game:queue-friend-update', handleQueueFriendUpdate);
		};
	});

	// Map FindMatch modes to server queue modes
	// Both 'prefs' and 'custom' send actual settings → use 'custom' server mode
	// 'quick' on the server always forces normal/5, so we only use it implicitly
	function findMatchModeToQueueMode(mode: 'random' | 'prefs' | 'custom'): 'quick' | 'wild' | 'custom' {
		switch (mode) {
			case 'random': return 'wild';
			case 'prefs': return 'custom';
			case 'custom': return 'custom';
		}
	}

	function handleFindMatch(matchSettings: { mode: 'random' | 'prefs' | 'custom'; speedPreset: SpeedPreset; winScore: number; powerUps: boolean }) {
		const socket = getSocket();
		if (!socket?.connected) {
			console.warn('Socket not connected');
			return;
		}

		const queueMode = findMatchModeToQueueMode(matchSettings.mode);

		socket.emit('game:queue-join', {
			mode: queueMode,
			settings: queueMode === 'wild' ? undefined : {
				speedPreset: matchSettings.speedPreset,
				winScore: matchSettings.winScore,
				powerUps: matchSettings.powerUps,
			},
		});

		// Start searching — stay on play page
		isSearching = true;
		searchTime = 0;
		matchFound = false;
		matchData = null;
		searchSettings = matchSettings;
		setQueuedSettings(matchSettings);
		searchInterval = setInterval(() => { searchTime += 1; }, 1000);
	}

	function cancelSearch() {
		const socket = getSocket();
		if (socket?.connected) socket.emit('game:queue-leave');
		isSearching = false;
		if (searchInterval) { clearInterval(searchInterval); searchInterval = null; }
		searchTime = 0;
		queuePosition = 0;
	}

	function acceptMatch() {
		if (matchData) {
			matchFound = false;
			goto(`/play/online/${matchData.roomId}`);
			matchData = null;
		}
	}

	function declineMatch() {
		const socket = getSocket();
		socket?.emit('game:leave');
		matchFound = false;
		matchData = null;
		if (pongGame) resumeGame(pongGame.getGameState());
	}

	function handleChallenge(friend: any, challengeSettings: { speedPreset: 'chill' | 'normal' | 'fast'; winScore: number; powerUps: boolean }) {
		const socket = getSocket();
		if (!socket?.connected) return;

		socket.emit('game:invite', {
			friendId: friend.id,
			settings: challengeSettings,
		});

		setWaiting({
			you: {
				username: layoutData?.user?.username ?? 'You',
				avatarUrl: layoutData?.user?.avatar_url ?? null,
				displayName: layoutData?.user?.name ?? null,
			},
			opponent: {
				username: friend.username,
				avatarUrl: friend.avatarUrl ?? null,
				displayName: friend.displayName ?? friend.username,
			},
			settings: {
				speedPreset: challengeSettings.speedPreset,
				winScore: challengeSettings.winScore,
				powerUps: challengeSettings.powerUps,
				mode: 'invite',
			},
			totalTime: 30,
		});
		goto('/play/online/waiting');
	}

	async function handleSavePrefs(prefs: { speedPreset: string; winScore: number; powerUps: boolean }) {
		// Optimistically update local state so UI reflects immediately
		userPrefs = { ...prefs };
		try {
			const res = await fetch('/api/settings/game-preferences', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(prefs),
			});
			if (!res.ok) {
				console.warn('Could not save preferences');
			}
		} catch (err) {
			console.warn('Could not save preferences:', err);
		}
	}

	// Initialize game mode from URL query param (so "go back" restores the tab)
	const validModes: GameMode[] = ['local', 'computer', 'online'];
	function getModeFromUrl(): GameMode {
		if (typeof window === 'undefined') return 'local';
		const m = new URLSearchParams(window.location.search).get('mode');
		return validModes.includes(m as GameMode) ? (m as GameMode) : 'local';
	}
	let gameMode = $state<GameMode>(getModeFromUrl());

	// Sync from URL on popstate (browser back/forward)
	onMount(() => {
		function onPopState() {
			gameMode = getModeFromUrl();
		}
		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	});

	// Update URL when game mode changes via UI (without adding history entries)
	let lastSyncedMode = getModeFromUrl();
	$effect(() => {
		if (gameMode === lastSyncedMode) return;
		lastSyncedMode = gameMode;
		const url = new URL(window.location.href);
		if (gameMode === 'local') {
			url.searchParams.delete('mode');
		} else {
			url.searchParams.set('mode', gameMode);
		}
		replaceState(url, {});
	});

	// ── Navigation guard: warn before leaving while in queue ──
	let showLeaveQueueModal = $state(false);
	let pendingNavCancel: (() => void) | null = $state(null);
	let pendingNavUrl: string | null = $state(null);

	beforeNavigate(({ cancel, to }) => {
		if (!to) return;
		if (to.url.pathname.startsWith('/play')) return;
		if (isSearching) {
			cancel();
			pendingNavUrl = to.url.pathname;
			pendingNavCancel = cancel;
			showLeaveQueueModal = true;
		}
	});

	function handleLeaveQueue() {
		showLeaveQueueModal = false;
		cancelSearch();
		if (pendingNavUrl) {
			goto(pendingNavUrl);
		}
		pendingNavCancel = null;
		pendingNavUrl = null;
	}

	function handleStayInQueue() {
		showLeaveQueueModal = false;
		pendingNavCancel = null;
		pendingNavUrl = null;
	}

	// Warn on refresh / tab close while in queue (native dialog — browsers don't allow custom UI here)
	$effect(() => {
		if (!isSearching) return;
		function onBeforeUnload(e: BeforeUnloadEvent) {
			e.preventDefault();
		}
		window.addEventListener('beforeunload', onBeforeUnload);
		return () => window.removeEventListener('beforeunload', onBeforeUnload);
	});

	let winScore = $state(5);
	let speedPreset = $state<SpeedPreset>("normal");
	let player2Name = $state("");
	let powerUps = $state(prefs.powerUps ?? false);
	let aiDifficulty = $state<AiDifficulty>("bart");

	// Build the settings object that PongGame needs
	let settings = $derived<GameSettings>({
		winScore,
		ballSpeed: SPEED_CONFIGS[speedPreset].ballSpeed,
		maxBallSpeed: SPEED_CONFIGS[speedPreset].maxBallSpeed,
		gameMode,
		difficulty: 'medium',
		powerUps,
		aiDifficulty,
	});

	let pongGame: PongGame;

	// Track game phase for showing/hiding UI elements
	let gamePhase = $state("menu");
	let settingsTab = $state<'game' | 'customize'>('game');

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

	async function handleGameOver(result: {
		score1: number;
		score2: number;
		winner: "player1" | "player2";
		durationSeconds: number;
		ballReturns: number;
		maxDeficit: number;
		reachedDeuce: boolean;
	}) {
		// Don't save matches for guests
		if (!isLoggedIn) return;

		saveStatus = "saving";

		// Determine Player 2's display name
		const p2DisplayName =
			gameMode === "computer"
				? aiOpponentDisplayName(settings)
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

			if (response.ok) {
				saveStatus = "saved";
				const data = await response.json();

				// Show progression modal after every match
				if (data.progression) {
					progressionResult = data.progression;
					showLevelUpModal = true;
				}
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
		gameMode === "local"
			? player2Name.trim() || "Guest"
			: gameMode === "computer"
				? aiOpponentDisplayName(settings)
				: "Computer"
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

<noscript>
	<div class="nojs-notice" role="status" aria-live="polite">
		Pong gameplay and matchmaking require JavaScript. With JavaScript disabled, mode switches,
		settings, and Start Game are unavailable.
		<a href="/instructions">Read instructions</a> or <a href="/profile">go to your profile</a>.
	</div>
</noscript>

<div class="game-container">
	<!-- Queue search banner (shown when searching + on local/computer tab) -->
	{#if isSearching && gameMode !== 'online'}
		<QueueSearchBanner
			{searchTime}
			{queuePosition}
			playersOnline={queueSize}
			settings={searchSettings}
			onCancel={cancelSearch}
		/>
	{/if}

	<!-- Match found modal (shown when match found during local/computer game) -->
	{#if showLeaveQueueModal}
		<LeaveQueueModal onLeave={handleLeaveQueue} onStay={handleStayInQueue} />
	{/if}

	{#if matchFound && matchData}
		<MatchFoundModal
			opponent={{
				username: matchData.player1.username === layoutData?.user?.username
					? matchData.player2.username
					: matchData.player1.username,
				avatarUrl: matchData.player1.username === layoutData?.user?.username
					? matchData.player2.avatarUrl ?? null
					: matchData.player1.avatarUrl ?? null,
			}}
			settings={matchData.settings}
			onAccept={acceptMatch}
			onDecline={declineMatch}
		/>
	{/if}

	<!-- Settings — only visible during menu -->
	{#if gamePhase === "menu"}
		<div class="game-header">
			<h1 class="pong-title">PONG</h1>
			<p class="pong-subtitle">ft_transcendence</p>
		</div>

		<!-- ═══ MENU PHASE ═══ -->
		<!-- Row 1: Game Mode + Quick Play side by side -->
		<div class="menu-row-top">
			<div class="menu-top-left">
				<PongSettings
					{gameMode}
					{winScore}
					{speedPreset}
					{player2Name}
					{isLoggedIn}
					{aiDifficulty}
					onGameModeChange={(v) => (gameMode = v)}
					onWinScoreChange={(v) => (winScore = v)}
					onSpeedChange={(v) => (speedPreset = v)}
					onPlayer2NameChange={(v) => (player2Name = v)}
					theme={prefs.theme}
					ballSkin={prefs.ballSkin}
					effectsPreset={prefs.effectsPreset}
					soundVolume={prefs.soundVolume}
					soundMuted={prefs.soundMuted}
					onThemeChange={(id) => {
						prefs.theme = id;
						const newTheme = getTheme(id);
						if (!newTheme.compatibleBallSkins.includes(prefs.ballSkin)) {
							prefs.ballSkin = 'default';
						}
						debouncedSavePreferences(prefs);
					}}
					onBallSkinChange={(id) => { prefs.ballSkin = id; debouncedSavePreferences(prefs); }}
					onEffectsChange={(p) => { prefs.effectsPreset = p as any; debouncedSavePreferences(prefs); }}
					onSoundVolumeChange={(v) => { prefs.soundVolume = v; debouncedSavePreferences(prefs); }}
					onSoundMuteChange={(m) => { prefs.soundMuted = m; debouncedSavePreferences(prefs); }}
					effectsCustom={prefs.effectsCustom}
					onEffectsCustomChange={(c) => { prefs.effectsCustom = c; debouncedSavePreferences(prefs); }}
					onSavePreferences={savePreferences}
					saveStatus={prefsSaveStatus}
					onTabChange={(tab) => settingsTab = tab}
					{powerUps}
					onPowerUpsChange={(v) => { powerUps = v; prefs.powerUps = v; debouncedSavePreferences(prefs); }}
					onStart={() => pongGame?.startGame()}
					onAiDifficultyChange={(v) => (aiDifficulty = v)}
				/>
			</div>
			{#if gameMode === 'online' && settingsTab === 'game'}
				<div class="menu-top-right">
					<FindMatch
						friends={onlineFriends}
						{queuePlayers}
						playersOnline={queueSize}
						userPrefs={userPrefs}
						searching={isSearching}
						{queuePosition}
						{searchTime}
						onCancelSearch={cancelSearch}
						onFindMatch={handleFindMatch}
						onAcceptMatch={(playerId) => {
							const socket = getSocket();
							if (!socket?.connected) return;
							const friend = onlineFriends.find(f => f.id === playerId);
							const stranger = queuePlayers.find(p => p.id === playerId);
							const targetSettings = friend?.queueSettings ?? stranger?.queueSettings;
							socket.emit('game:queue-join', {
								mode: 'custom',
								settings: targetSettings ?? { speedPreset: 'normal', winScore: 5 },
							});
							isSearching = true;
							searchTime = 0;
							searchInterval = setInterval(() => { searchTime += 1; }, 1000);
						}}
						onChallenge={handleChallenge}
						onSavePrefs={handleSavePrefs}
					/>
				</div>
			{/if}
		</div>

		<!-- Row 2: Friends + Open Queue (only when online + game tab) -->
		{#if gameMode === 'online' && settingsTab === 'game'}
			<div class="menu-row-bottom">
				<div class="list-half">
					<FriendsList
						friends={onlineFriends}
						searching={isSearching}
						onAcceptMatch={(playerId) => {
							const socket = getSocket();
							if (!socket?.connected) return;
							const friend = onlineFriends.find(f => f.id === playerId);
							const targetSettings = friend?.queueSettings;
							socket.emit('game:queue-join', {
								mode: 'custom',
								settings: targetSettings ?? { speedPreset: 'normal', winScore: 5 },
							});
							isSearching = true;
							searchTime = 0;
							searchInterval = setInterval(() => { searchTime += 1; }, 1000);
						}}
						onChallenge={handleChallenge}
						getActiveSettings={() => ({ speedPreset: userPrefs.speedPreset as SpeedPreset, winScore: userPrefs.winScore, powerUps: userPrefs.powerUps ?? true })}
					/>
				</div>
				<div class="list-divider"></div>
				<div class="list-half">
					<QueueList
						{queuePlayers}
						searching={isSearching}
						onAcceptMatch={(playerId) => {
							const socket = getSocket();
							if (!socket?.connected) return;
							const stranger = queuePlayers.find(p => p.id === playerId);
							const targetSettings = stranger?.queueSettings;
							socket.emit('game:queue-join', {
								mode: 'custom',
								settings: targetSettings ?? { speedPreset: 'normal', winScore: 5 },
							});
							isSearching = true;
							searchTime = 0;
							searchInterval = setInterval(() => { searchTime += 1; }, 1000);
						}}
					/>
				</div>
			</div>
		{/if}
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
		<PongGame bind:this={pongGame} {settings} onGameOver={handleGameOver} themeId={prefs.theme} ballSkinId={prefs.ballSkin} effectsConfig={{ preset: prefs.effectsPreset, custom: prefs.effectsCustom }} soundMuted={prefs.soundMuted} onMuteChange={(m) => { prefs.soundMuted = m; debouncedSavePreferences(prefs); }} canStart={settingsTab === 'game' && gameMode !== 'online'} />
	</div>

	<!-- Status bar — changes based on game phase -->
	<div class="status-bar">
		{#if gamePhase === "menu" && settingsTab === 'game' && gameMode !== 'online'}
			<span class="status-text">Press SPACE to start</span>
		{:else if gamePhase === "countdown"}
			<span class="status-text">Get ready...</span>
		{:else if gamePhase === "playing"}
			<PongControls {gameMode} computerOpponentName={aiOpponentDisplayName(settings)} />
		{:else if gamePhase === "paused"}
			<span class="status-text">Game paused — press SPACE to resume or ESC to quit</span>
		{:else if gamePhase === "gameover"}
			<div class="gameover-status">
				<span class="status-text">Press SPACE to play again</span>
				{#if saveStatus === "saving"}
					<span class="save-indicator saving">Saving match...</span>
				{:else if saveStatus === "saved"}
					<span class="save-indicator saved">✓ Match saved</span>
					{#if progressionResult}
						<span class="xp-indicator"
							>+{progressionResult.xpEarned} XP</span
						>
					{/if}
				{:else if saveStatus === "error"}
					<span class="save-indicator error"
						>Match not saved (not logged in?)</span
					>
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

	.nojs-notice {
		max-width: 950px;
		margin: 1rem auto 0;
		padding: 0.85rem 1rem;
		border-radius: 0.6rem;
		border: 1px solid rgba(255, 107, 157, 0.3);
		background: rgba(255, 107, 157, 0.08);
		color: #ffd9e7;
		font-size: 0.9rem;
		line-height: 1.45;
	}

	.nojs-notice a {
		color: #ffd9e7;
		text-decoration: underline;
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

	/* ===== Menu phase layout ===== */
	.menu-row-top {
		display: flex;
		gap: 1rem;
		width: 100%;
		max-width: 950px;
		align-items: center;
		justify-content: center;
	}

	.menu-top-left {
		flex: 0 0 auto;
	}

	.menu-top-right {
		flex: 1;
		min-width: 0;
	}

	.menu-row-bottom {
		display: flex;
		width: 100%;
		max-width: 950px;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		overflow: hidden;
	}

	.list-half {
		flex: 1;
		min-width: 0;
		padding: 0.75rem;
	}

	.list-divider {
		width: 1px;
		background: rgba(255, 255, 255, 0.05);
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

	.xp-indicator {
		color: #ff6b9d;
		font-size: 0.85rem;
		font-weight: 600;
		animation: xpPop 0.3s ease-out;
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

	/* ===== Responsive ===== */
	@media (max-width: 640px) {
		.menu-row-top {
			flex-direction: column;
		}

		.menu-row-bottom {
			flex-direction: column;
		}

		.list-divider {
			width: 100%;
			height: 1px;
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
