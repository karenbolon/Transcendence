<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { getSocket } from '$lib/stores/socket.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { onMount, onDestroy } from 'svelte';
	import Bracket from '$lib/component/tournament/Bracket.svelte';
	import TournamentLobby from '$lib/component/tournament/TournamentLobby.svelte';
	import Starfield from '$lib/component/effect/Starfield.svelte';
	import NoiseGrain from '$lib/component/effect/NoiseGrain.svelte';

	let { data } = $props();

	// Server data as base, with socket overrides
	let socketOverrides: {
		status?: string;
		winnerId?: number | null;
		bracket?: any[] | null;
		isParticipant?: boolean;
	} = $state({});

	let tournament = $derived({ ...data.tournament, ...( socketOverrides.status ? { status: socketOverrides.status } : {}), ...( socketOverrides.winnerId !== undefined ? { winnerId: socketOverrides.winnerId } : {}) });
	let participants = $derived(data.participants);
	let bracket = $derived(socketOverrides.bracket ?? data.bracket);
	let isCreator = $derived(data.isCreator);
	let isParticipant = $derived(socketOverrides.isParticipant ?? data.isParticipant);

	// Reset overrides when data changes (e.g. navigation/invalidation)
	$effect(() => {
		data; // track
		socketOverrides = {};
	});

	function handleJoin() {
		const socket = getSocket();
		if (!socket?.connected) { toast.error('Not connected'); return; }
		socket.emit('tournament:join', { tournamentId: tournament.id });
		socket.once('tournament:joined', () => {
			socketOverrides.isParticipant = true;
			socketOverrides = { ...socketOverrides };
			toast.success('Joined tournament!');
			invalidateAll();
		});
		socket.once('tournament:error', (d: { message: string }) => toast.error(d.message));
	}

	function handleLeave() {
		const socket = getSocket();
		if (!socket?.connected) return;
		socket.emit('tournament:leave', { tournamentId: tournament.id });
		socket.once('tournament:left', () => {
			socketOverrides.isParticipant = false;
			socketOverrides = { ...socketOverrides };
			toast.info('Left tournament');
			invalidateAll();
		});
		socket.once('tournament:error', (d: { message: string }) => toast.error(d.message));
	}

	function handleStart() {
		const socket = getSocket();
		if (!socket?.connected) return;
		socket.emit('tournament:start', { tournamentId: tournament.id });
		socket.once('tournament:error', (d: { message: string }) => toast.error(d.message));
	}

	// Listen for real-time updates
	onMount(() => {
		const socket = getSocket();
		if (!socket) return;

		socket.on('tournament:player-joined', (d: any) => {
			if (d.tournamentId === tournament.id) invalidateAll();
		});
		socket.on('tournament:player-left', (d: any) => {
			if (d.tournamentId === tournament.id) invalidateAll();
		});
		socket.on('tournament:started', (d: any) => {
			if (d.tournamentId === tournament.id) {
				socketOverrides = { ...socketOverrides, status: 'in_progress', bracket: d.bracket };
			}
		});
		socket.on('tournament:bracket-update', (d: any) => {
			if (d.tournamentId === tournament.id) {
				socketOverrides = { ...socketOverrides, bracket: d.bracket };
			}
		});
		socket.on('tournament:finished', (d: any) => {
			if (d.tournamentId === tournament.id) {
				socketOverrides = { ...socketOverrides, status: 'finished', winnerId: d.winnerId, bracket: d.bracket };
			}
		});
	});

	onDestroy(() => {
		const socket = getSocket();
		if (!socket) return;
		socket.off('tournament:player-joined');
		socket.off('tournament:player-left');
		socket.off('tournament:started');
		socket.off('tournament:bracket-update');
		socket.off('tournament:finished');
	});

	function statusLabel(status: string): string {
		if (status === 'scheduled') return 'Open';
		if (status === 'in_progress') return 'In Progress';
		return 'Finished';
	}

	let winnerUsername = $derived.by(() => {
		if (!tournament.winnerId) return null;
		const winner = participants.find((p: any) => p.userId === tournament.winnerId);
		return winner?.name ?? winner?.username ?? null;
	});
</script>

<Starfield />
<NoiseGrain />

<div class="page">
	<div class="back-row">
		<a href="/tournaments" class="back-link">← Tournaments</a>
	</div>

	<div class="header">
		<div>
			<h1 class="title">{tournament.name}</h1>
			<span class="status status-{tournament.status}">{statusLabel(tournament.status)}</span>
		</div>
	</div>

	{#if tournament.status === 'finished' && winnerUsername}
		<div class="winner-banner">
			🏆 <strong>{winnerUsername}</strong> is the champion!
		</div>
	{/if}

	{#if tournament.status === 'scheduled'}
		<TournamentLobby
			{participants}
			maxPlayers={tournament.maxPlayers}
			{isCreator}
			{isParticipant}
			tournamentId={tournament.id}
			onJoin={handleJoin}
			onLeave={handleLeave}
			onStart={handleStart}
		/>
	{/if}

	{#if bracket && bracket.length > 0}
		<div class="bracket-section">
			<h2 class="section-title">Bracket</h2>
			<Bracket {bracket} currentUserId={data.userId} />
		</div>
	{/if}

	{#if tournament.status !== 'scheduled' && participants.length > 0}
		<div class="participants-section">
			<h2 class="section-title">Participants</h2>
			<div class="participants-grid">
				{#each [...participants].sort((a, b) => (a.placement ?? 999) - (b.placement ?? 999)) as p}
					<div class="participant" class:eliminated={p.status === 'eliminated'} class:champion={p.status === 'champion'}>
						<span class="p-name">{p.name ?? p.username}</span>
						{#if p.status === 'champion'}
							<span class="p-badge champion-badge">🏆 1st Place</span>
						{:else if p.placement === 2}
							<span class="p-badge silver-badge">🥈 2nd Place</span>
						{:else if p.placement === 3}
							<span class="p-badge bronze-badge">🥉 3rd Place</span>
						{:else if p.status === 'eliminated' && p.placement}
							<span class="p-badge elim-badge">{p.placement}th Place</span>
						{:else if p.status === 'eliminated'}
							<span class="p-badge elim-badge">Eliminated</span>
						{:else if p.status === 'active'}
							<span class="p-badge active-badge">Active</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 900px;
		margin: 0 auto;
		padding: 32px 16px;
		position: relative;
		z-index: 1;
	}
	.back-row {
		margin-bottom: 16px;
	}
	.back-link {
		color: #888;
		text-decoration: none;
		font-size: 0.85rem;
		transition: color 0.2s;
	}
	.back-link:hover { color: var(--accent); }

	.header {
		margin-bottom: 24px;
	}
	.title {
		font-size: 1.8rem;
		margin: 0 0 8px;
	}
	.status {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 3px 8px;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.status-scheduled { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
	.status-in_progress { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
	.status-finished { background: rgba(255, 255, 255, 0.1); color: #888; }

	.winner-banner {
		background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(255, 107, 157, 0.1));
		border: 1px solid rgba(251, 191, 36, 0.3);
		border-radius: 12px;
		padding: 16px 20px;
		text-align: center;
		font-size: 1.1rem;
		margin-bottom: 24px;
	}

	.bracket-section, .participants-section {
		margin-top: 32px;
	}
	.section-title {
		font-size: 1.1rem;
		margin: 0 0 16px;
		color: #ccc;
	}

	.participants-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 8px;
	}
	.participant {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		background: rgba(255, 255, 255, 0.04);
		border-radius: 8px;
		font-size: 0.85rem;
	}
	.participant.eliminated { opacity: 0.5; }
	.participant.champion { border: 1px solid rgba(251, 191, 36, 0.3); }

	.p-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.p-badge {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 4px;
		margin-left: 8px;
		white-space: nowrap;
	}
	.champion-badge { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
	.silver-badge { background: rgba(192, 192, 192, 0.15); color: #c0c0c0; }
	.bronze-badge { background: rgba(205, 127, 50, 0.15); color: #cd7f32; }
	.elim-badge { background: rgba(255, 255, 255, 0.08); color: #888; }
	.active-badge { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
</style>
