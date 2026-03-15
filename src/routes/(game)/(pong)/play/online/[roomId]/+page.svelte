<script lang="ts">
	import { goto } from '$app/navigation';
	import { getSocket } from '$lib/stores/socket.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { onMount } from 'svelte';
	import OnlineGame from '$lib/component/pong/OnlineGame.svelte';

	let { data } = $props();

	// State: waiting for room join confirmation → playing → game over
	let gameReady = $state(false);
	let side = $state<'left' | 'right'>('left');
	let player1 = $state({ userId: 0, username: '' });
	let player2 = $state({ userId: 0, username: '' });
	let gameOverResult: any = $state(null);

	onMount(() => {
	const socket = getSocket();
	if (!socket?.connected) {
		toast.error('Not connected to server');
		goto('/play');
		return;
	}

	// Server responds with game:joined after we join the room
	// This tells us which side we play and who our opponent is
	socket.on('game:joined', (joinData: {
		roomId: string;
		side: 'left' | 'right';
		player1: { userId: number; username: string };
		player2: { userId: number; username: string };
	}) => {
		side = joinData.side;
		player1 = joinData.player1;
		player2 = joinData.player2;
		gameReady = true;
	});

	// If room doesn't exist or we're not in it
	socket.on('game:error', (errData: { message: string }) => {
		toast.error(errData.message);
		goto('/play');
	});

	// Tell the server we're here
	// Retry every 2 seconds if we don't get game:joined back
	// (handles race condition where socket briefly disconnects during navigation)
	function tryJoinRoom() {
		if (!gameReady) {
			socket.emit('game:join-room', { roomId: data.roomId });
		}
	}

	tryJoinRoom();
	const retryInterval = setInterval(tryJoinRoom, 2000);

	// Also retry when socket reconnects
	socket.on('connect', tryJoinRoom);

	return () => {
		clearInterval(retryInterval);
		socket.off('game:joined');
		socket.off('game:error');
		socket.off('connect', tryJoinRoom);
	};
	});

	function handleGameOver(result: any) {
	gameOverResult = result;
	}

	function goBack() {
	const socket = getSocket();
	socket?.emit('game:leave');
	goto('/play');
	}
</script>

<div class="online-game-container">
	{#if !gameReady}
	<!-- Waiting state: room exists but we haven't joined yet -->
	<div class="waiting">
		<h2>Waiting for opponent...</h2>
		<p class="waiting-text">Setting up game room</p>
		<button class="back-btn" onclick={goBack}>Cancel</button>
	</div>

	{:else if gameOverResult}
	<!-- Game over state: show results -->
	<div class="game-over-panel">
		<h2>{gameOverResult.winnerUsername} wins!</h2>
		<p>{gameOverResult.player1.username} {gameOverResult.player1.score} — {gameOverResult.player2.score} {gameOverResult.player2.username}</p>
		<button class="back-btn" onclick={() => goto('/play')}>Back to Menu</button>
		<button class="back-btn" onclick={() => goto('/friends')}>Challenge Again</button>
	</div>

	{:else}
	<!-- Playing state: show the game -->
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
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1.25rem;
	width: 100%;
	}

	.waiting {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1rem;
	padding: 3rem;
	color: #9ca3af;
	}

	.waiting h2 {
	color: #ffffff;
	font-size: 1.5rem;
	}

	.waiting-text {
	font-size: 0.9rem;
	}

	.game-over-panel {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1rem;
	padding: 2rem;
	color: #ffffff;
	}

	.game-over-panel h2 {
	color: #ff6b9d;
	font-size: 1.5rem;
	}

	.game-over-panel p {
	color: #9ca3af;
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
</style>
