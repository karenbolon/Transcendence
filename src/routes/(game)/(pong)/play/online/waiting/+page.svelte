<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getSocket } from '$lib/stores/socket.svelte';
	import { getWaiting, clearWaiting } from '$lib/stores/matchmaking.svelte';
	import WaitingRoom from '$lib/component/matchmaking/WaitingRoom.svelte';
	import AmbientBackground from '$lib/component/effect/AmbientBackground.svelte';
	import Aurora from '$lib/component/effect/Aurora.svelte';

	const data = getWaiting();

	// If no waiting data (e.g. user refreshed the page), go back
	if (!data) {
		goto('/play');
	}

	let lobbyState = $state<'waiting' | 'connecting' | 'declined' | 'expired'>('waiting');
	let timeLeft = $state(data?.totalTime ?? 30);

	// Countdown timer
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		const socket = getSocket();
		if (!socket?.connected || !data) {
			goto('/play');
			return;
		}

		// Start countdown
		timerInterval = setInterval(() => {
			timeLeft -= 1;
			if (timeLeft <= 0) {
				lobbyState = 'expired';
				if (timerInterval) clearInterval(timerInterval);
			}
		}, 1000);

		// Opponent accepted → game room created, server sends game:start
		function handleGameStart(evtData: { roomId: string }) {
			lobbyState = 'connecting';
			if (timerInterval) clearInterval(timerInterval);
			// Short delay so user sees "Opponent accepted!" before navigating
			setTimeout(() => {
				clearWaiting();
				goto(`/play/online/${evtData.roomId}`);
			}, 800);
		}

		// Opponent declined
		function handleDeclined() {
			lobbyState = 'declined';
			if (timerInterval) clearInterval(timerInterval);
		}

		socket.on('game:start', handleGameStart);
		socket.on('game:invite-declined', handleDeclined);

		return () => {
			if (timerInterval) clearInterval(timerInterval);
			socket.off('game:start', handleGameStart);
			socket.off('game:invite-declined', handleDeclined);
		};
	});

	let isQueueMode = data?.settings.mode !== 'invite';

	function handleCancel() {
		const socket = getSocket();
		if (lobbyState === 'waiting') {
			// Active cancel — leave queue or cancel invite
			if (isQueueMode) {
				socket?.emit('game:queue-leave');
			} else {
				socket?.emit('game:invite-cancel');
			}
		}
		clearWaiting();
		// Go back to wherever the user came from
		if (history.length > 1) {
			history.back();
		} else {
			goto('/play');
		}
	}
</script>
<AmbientBackground bgColor="#0a0a1e" maxDelay={1} />
<Aurora />

<div class="waiting-page">
		{#if data}
			<WaitingRoom
				{lobbyState}
				you={data.you}
				opponent={data.opponent}
				settings={{ speedPreset: data.settings.speedPreset, winScore: data.settings.winScore, mode: data.settings.mode }}
				{timeLeft}
				totalTime={data.totalTime}
				onCancel={handleCancel}
			/>
		{/if}
	</div>

<style>
	.waiting-page {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 70vh;
	}
</style>
