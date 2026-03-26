<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { getSocket } from '$lib/stores/socket.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { onMount, onDestroy } from 'svelte';
	import Starfield from '$lib/component/effect/Starfield.svelte';
	import NoiseGrain from '$lib/component/effect/NoiseGrain.svelte';

	let { data } = $props();

	// Real-time updates: refresh list when tournaments change
	onMount(() => {
		const socket = getSocket();
		if (!socket) return;
		socket.on('tournament:player-joined', () => invalidateAll());
		socket.on('tournament:player-left', () => invalidateAll());
		socket.on('tournament:started', () => invalidateAll());
		socket.on('tournament:finished', () => invalidateAll());
	});
	onDestroy(() => {
		const socket = getSocket();
		if (!socket) return;
		socket.off('tournament:player-joined');
		socket.off('tournament:player-left');
		socket.off('tournament:started');
		socket.off('tournament:finished');
	});

	type Tab = 'open' | 'active' | 'finished';
	let activeTab: Tab = $state('open');

	let filtered = $derived.by(() => {
		if (activeTab === 'open') return data.tournaments.filter((t: any) => t.status === 'scheduled');
		if (activeTab === 'active') return data.tournaments.filter((t: any) => t.status === 'in_progress');
		return data.tournaments.filter((t: any) => t.status === 'finished');
	});

	// Create modal
	let showCreate = $state(false);
	let newName = $state('');
	let newMaxPlayers = $state(4);
	let creating = $state(false);

	function createTournament() {
		if (!newName.trim()) return;
		const socket = getSocket();
		if (!socket?.connected) { toast.error('Not connected'); return; }
		creating = true;
		socket.emit('tournament:create', { name: newName.trim(), maxPlayers: newMaxPlayers });
		socket.once('tournament:created', (d: { tournamentId: number }) => {
			creating = false;
			showCreate = false;
			newName = '';
			toast.success('Tournament created!');
			goto(`/tournaments/${d.tournamentId}`);
		});
		socket.once('tournament:error', (d: { message: string }) => {
			creating = false;
			toast.error(d.message);
		});
	}

	function joinTournament(tournamentId: number) {
		const socket = getSocket();
		if (!socket?.connected) { toast.error('Not connected'); return; }
		socket.emit('tournament:join', { tournamentId });
		socket.once('tournament:joined', () => {
			toast.success('Joined!');
			goto(`/tournaments/${tournamentId}`);
		});
		socket.once('tournament:error', (d: { message: string }) => {
			toast.error(d.message);
		});
	}

	function statusLabel(status: string): string {
		if (status === 'scheduled') return 'Open';
		if (status === 'in_progress') return 'In Progress';
		return 'Finished';
	}

	const tabs: { key: Tab; label: string }[] = [
		{ key: 'open', label: 'Open' },
		{ key: 'active', label: 'Active' },
		{ key: 'finished', label: 'Finished' },
	];
</script>

<Starfield />
<NoiseGrain />

<div class="page">
	<div class="page-header">
		<h1 class="page-title">Tournaments</h1>
		<button class="btn-create" onclick={() => showCreate = true}>+ Create Tournament</button>
	</div>

	<div class="tabs">
		{#each tabs as tab}
			<button
				class="tab" class:active={activeTab === tab.key}
				onclick={() => activeTab = tab.key}
			>{tab.label}</button>
		{/each}
	</div>

	{#if filtered.length === 0}
		<div class="empty">
			{#if activeTab === 'open'}
				No open tournaments. Create one!
			{:else if activeTab === 'active'}
				No active tournaments right now.
			{:else}
				No finished tournaments yet.
			{/if}
		</div>
	{:else}
		<div class="tournament-list">
			{#each filtered as t}
				<a href="/tournaments/{t.id}" class="tournament-card">
					<div class="card-top">
						<h3 class="card-name">{t.name}</h3>
						<span class="card-status status-{t.status}">{statusLabel(t.status)}</span>
					</div>
					<div class="card-meta">
						<span>{t.participantCount} / {t.maxPlayers} players</span>
						<span>by {t.creatorUsername}</span>
					</div>
					{#if t.status === 'scheduled'}
						<div class="card-actions">
							<button class="btn-join" onclick={(e) => { e.stopPropagation(); joinTournament(t.id); }}>Join</button>
						</div>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
</div>

<!-- Create Modal -->
{#if showCreate}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
	<div class="modal-overlay" onclick={() => showCreate = false}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Create Tournament</h2>
			<div class="form-group">
				<label for="t-name">Name</label>
				<input id="t-name" bind:value={newName} placeholder="My Tournament" maxlength="100" />
			</div>
			<div class="form-group">
				<label for="t-size">Max Players</label>
				<select id="t-size" bind:value={newMaxPlayers}>
					<option value={4}>4 players</option>
					<option value={8}>8 players</option>
					<option value={16}>16 players</option>
				</select>
			</div>
			<div class="modal-actions">
				<button class="btn-cancel" onclick={() => showCreate = false}>Cancel</button>
				<button class="btn-confirm" onclick={createTournament} disabled={creating || !newName.trim()}>
					{creating ? 'Creating...' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.page {
		max-width: 800px;
		margin: 0 auto;
		padding: 32px 16px;
		position: relative;
		z-index: 1;
	}
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
	}
	.page-title {
		font-size: 1.8rem;
		margin: 0;
	}
	.btn-create {
		background: var(--accent);
		color: #fff;
		border: none;
		padding: 10px 20px;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background 0.2s;
	}
	.btn-create:hover { background: var(--accent-hover); }

	.tabs {
		display: flex;
		gap: 4px;
		margin-bottom: 24px;
		background: rgba(255, 255, 255, 0.05);
		padding: 4px;
		border-radius: 8px;
	}
	.tab {
		flex: 1;
		padding: 8px;
		background: transparent;
		border: none;
		color: #888;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		border-radius: 6px;
		transition: all 0.2s;
	}
	.tab.active {
		background: var(--accent);
		color: #fff;
	}

	.empty {
		text-align: center;
		color: #666;
		padding: 48px 0;
		font-size: 0.95rem;
	}

	.tournament-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.tournament-card {
		display: block;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 16px 20px;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.2s, background 0.2s;
	}
	.tournament-card:hover {
		border-color: var(--accent-muted);
		background: rgba(255, 255, 255, 0.06);
	}
	.card-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}
	.card-name {
		margin: 0;
		font-size: 1.05rem;
	}
	.card-status {
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

	.card-meta {
		display: flex;
		gap: 16px;
		font-size: 0.8rem;
		color: #888;
	}
	.card-actions {
		margin-top: 12px;
	}
	.btn-join {
		background: var(--accent);
		color: #fff;
		border: none;
		padding: 6px 16px;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}
	.btn-join:hover { background: var(--accent-hover); }

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.modal {
		background: #1e1e36;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 24px;
		width: 100%;
		max-width: 400px;
	}
	.modal h2 {
		margin: 0 0 20px;
		font-size: 1.2rem;
	}
	.form-group {
		margin-bottom: 16px;
	}
	.form-group label {
		display: block;
		font-size: 0.8rem;
		color: #888;
		margin-bottom: 6px;
	}
	.form-group input, .form-group select {
		width: 100%;
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: #e5e5e5;
		font-size: 0.9rem;
		outline: none;
	}
	.form-group input:focus, .form-group select:focus {
		border-color: var(--accent);
	}
	.modal-actions {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
	}
	.btn-cancel {
		background: rgba(255, 255, 255, 0.1);
		color: #ccc;
		border: none;
		padding: 8px 16px;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.btn-confirm {
		background: var(--accent);
		color: #fff;
		border: none;
		padding: 8px 20px;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		font-size: 0.85rem;
		transition: background 0.2s;
	}
	.btn-confirm:hover:not(:disabled) { background: var(--accent-hover); }
	.btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
