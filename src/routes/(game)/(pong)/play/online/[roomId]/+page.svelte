<script lang="ts">
	import { goto } from '$app/navigation';
	import { getSocket } from '$lib/stores/socket.svelte';
	import { setWaiting, getGameStart, clearGameStart, clearQueuedSettings } from '$lib/stores/matchmaking.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import OnlineGame from '$lib/component/pong/OnlineGame.svelte';
	import GameOver from '$lib/component/pong/GameOver.svelte';
	import AmbientBackground from '$lib/component/effect/AmbientBackground.svelte';
	import Starfield from '$lib/component/effect/Starfield.svelte';
	import Aurora from '$lib/component/effect/Aurora.svelte';
	import Scanlines from '$lib/component/effect/Scanlines.svelte';
	import NoiseGrain from '$lib/component/effect/NoiseGrain.svelte';

	let { data } = $props();

	// State: waiting for room join confirmation → playing → game over
	let gameReady = $state(false);
	let side = $state<'left' | 'right'>('left');
	let player1 = $state({ userId: 0, username: '', displayName: null as string | null, avatarUrl: null as string | null });
	let player2 = $state({ userId: 0, username: '', displayName: null as string | null, avatarUrl: null as string | null });
	let gameOverResult: any = $state(null);

	// Reactive to data.roomId — re-runs when navigating between rooms.
	// This is the key fix: onMount only runs once, but $effect re-runs
	// when data.roomId changes (same route pattern, different params).
	// Without this, clicking "Challenge Again" from the game over screen
	// would navigate to /play/online/newRoomId but onMount wouldn't re-run
	// because SvelteKit reuses the component for the same route pattern.
	$effect(() => {
		const roomId = data.roomId; // dependency — effect re-runs when this changes

		// Reset all state for the new room
		gameReady = false;
		gameOverResult = null;

		const socket = getSocket();
		if (!socket?.connected) {
			toast.error('Not connected to server');
			goto('/play');
			return;
		}

		// Server responds with game:joined after we join the room
		function handleJoined(joinData: {
			roomId: string;
			side: 'left' | 'right';
			player1: { userId: number; username: string };
			player2: { userId: number; username: string };
		}) {
			side = joinData.side;
			// Enrich player data with avatar/name from game:start store and page load
			const gsData = getGameStart();
			const enrichPlayer = (p: { userId: number; username: string }) => {
				// Our own data from page load
				if (p.userId === data.userId) {
					return { ...p, displayName: data.displayName, avatarUrl: data.avatarUrl };
				}
				// Opponent data from game:start event
				const gsPlayer = gsData?.player1.userId === p.userId ? gsData.player1
					: gsData?.player2.userId === p.userId ? gsData.player2 : null;
				return {
					...p,
					displayName: gsPlayer?.displayName ?? null,
					avatarUrl: gsPlayer?.avatarUrl ?? null,
				};
			};
			player1 = enrichPlayer(joinData.player1);
			player2 = enrichPlayer(joinData.player2);
			clearQueuedSettings();
			clearGameStart();
			gameReady = true;

			// Show match settings as a toast so both players know what they're playing
			const s = gsData?.settings;
			if (s) {
				const speed = s.speedPreset.charAt(0).toUpperCase() + s.speedPreset.slice(1);
				toast.game('Game Settings', `${speed} · First to ${s.winScore}`);
			}
		}

		// If room doesn't exist or we're not in it
		function handleError(errData: { message: string }) {
			toast.error(errData.message);
			goto('/play');
		}

		// Game cancelled (opponent left at 0-0 or before game started)
		function handleCancelled(cancelData: { reason: string }) {
			toast.info(cancelData.reason);
			if (history.length > 1) {
				history.back();
			} else {
				goto('/play');
			}
		}

		socket.on('game:joined', handleJoined);
		socket.on('game:error', handleError);
		socket.on('game:cancelled', handleCancelled);

		// Tell the server we're here
		socket.emit('game:join-room', { roomId });

		// Cleanup: runs when roomId changes or component is destroyed
		return () => {
			socket.off('game:joined', handleJoined);
			socket.off('game:error', handleError);
			socket.off('game:cancelled', handleCancelled);
		};
	});

	function handleGameOver(result: any) {
		gameOverResult = result;
	}

	function goBack() {
		const socket = getSocket();
		socket?.emit('game:leave');
		if (history.length > 1) {
			history.back();
		} else {
			goto('/play');
		}
	}

	// Challenge the same opponent again → send invite → waiting room
	function challengeAgain() {
		const socket = getSocket();
		if (!socket?.connected) return;

		const opponentId = data.userId === player1.userId ? player2.userId : player1.userId;
		const opponentName = data.userId === player1.userId ? player2.username : player1.username;

		socket.emit('game:invite', { friendId: opponentId, settings: gameOverResult.settings });

		const myPlayer = data.userId === player1.userId ? player1 : player2;
		const opponentPlayer = data.userId === player1.userId ? player2 : player1;
		setWaiting({
			you: { username: data.username, avatarUrl: myPlayer.avatarUrl, displayName: myPlayer.displayName },
			opponent: { username: opponentName, avatarUrl: opponentPlayer.avatarUrl, displayName: opponentPlayer.displayName },
			settings: { speedPreset: gameOverResult.settings.speedPreset as 'chill' | 'normal' | 'fast', winScore: gameOverResult.settings.winScore, mode: 'online' },
			totalTime: 30,
		});
		goto('/play/online/waiting');
	}

	// Build GameOver data from the raw result
	// "player1" in GameOver = YOU (current user), "player2" = opponent
	let gameOverData = $derived.by(() => {
		if (!gameOverResult) return null;
		const iAmPlayer1 = data.userId === player1.userId;
		const me = iAmPlayer1 ? gameOverResult.player1 : gameOverResult.player2;
		const them = iAmPlayer1 ? gameOverResult.player2 : gameOverResult.player1;
		const myUsername = iAmPlayer1 ? player1.username : player2.username;
		const theirUsername = iAmPlayer1 ? player2.username : player1.username;
		const iWon = gameOverResult.winnerId === data.userId;
		const myPlayer = iAmPlayer1 ? player1 : player2;
		const theirPlayer = iAmPlayer1 ? player2 : player1;
		return {
		winner: (iWon ? 'player1' : 'player2') as 'player1' | 'player2',
		player1: {
			username: myUsername,
			displayName: myPlayer.displayName,
			avatarUrl: myPlayer.avatarUrl,
			score: me.score,
		},
		player2: {
			username: theirUsername,
			displayName: theirPlayer.displayName,
			avatarUrl: theirPlayer.avatarUrl,
			score: them.score,
		},
		stats: {
			durationSeconds: gameOverResult.durationSeconds,
			speedPreset: gameOverResult.settings.speedPreset,
			winScore: gameOverResult.settings.winScore,
		},
		newBadges: [] as { emoji: string; name: string }[],
	};
	});
</script>

<AmbientBackground bgColor="#0a0a1e" maxDelay={1} />
<Starfield starCount={30} />
<Aurora />
<Scanlines opacity={0.04} />
<!-- <NoiseGrain opacity={0.03} /> -->

<div class="online-game-container">
	{#if !gameReady}
		<!-- Waiting state: room exists but we haven't joined yet -->
		<div class="waiting">
			<div class="spinner"></div>
			<p class="waiting-text">Joining game...</p>
			<button class="back-btn" onclick={goBack}>Cancel</button>
		</div>

	{:else if gameOverResult && gameOverData}
		<!-- Game over state: show results -->
		<GameOver
			{gameOverData}
			gameMode="online"
			onRematch={challengeAgain}
			onBackToMenu={goBack}
		/>

	{:else}
		<!-- Playing state: show the game -->
		<div class="player-bar">
			<div class="player-side">
				<div class="player-avatar p1">🎮</div>
				<div class="player-info-block">
					<span class="player-name p1">{player1.username}</span>
				</div>
			</div>
			<div class="vs-badge">VS</div>
			<div class="player-side">
				<div class="player-info-block right">
					<span class="player-name p2">{player2.username}</span>
				</div>
				<div class="player-avatar p2">👾</div>
			</div>
		</div>
		<OnlineGame
			roomId={data.roomId}
			{side}
			{player1}
			{player2}
			onGameOver={handleGameOver}
		/>
		<div class="status-bar">
			<span class="vs-label">{player1.username} vs {player2.username}</span>
			<button class="forfeit-btn" onclick={goBack}>Forfeit</button>
		</div>
	{/if}
</div>

<style>

	.online-game-container {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		width: 100%;
		padding: 1rem 0 2rem;
	}

	.waiting {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem;
		color: #9ca3af;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid rgba(255, 107, 157, 0.15);
		border-top-color: #ff6b9d;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.waiting-text {
		font-size: 0.85rem;
		color: #6b7280;
	}


	.status-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		max-width: 800px;
	}

	.vs-label {
		color: #6b7280;
		font-size: 0.85rem;
	}

	.back-btn, .forfeit-btn {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);
		color: #9ca3af;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.back-btn:hover, .forfeit-btn:hover {
		border-color: rgba(255, 107, 157, 0.3);
		color: #d1d5db;
	}

	.forfeit-btn {
		border-color: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.forfeit-btn:hover {
		background: rgba(239, 68, 68, 0.1);
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
</style>
