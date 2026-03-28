<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { getSocket } from '$lib/stores/socket.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { speedEmoji } from '$lib/utils/format_game';
	import { capitalize } from '$lib/utils/format_progression';
	import { timeAgo, ordinal } from '$lib/utils/format_date';
	import UserAvatar from '$lib/component/UserAvatar.svelte';
	import Starfield from '$lib/component/effect/Starfield.svelte';
	import NoiseGrain from '$lib/component/effect/NoiseGrain.svelte';

	let { data } = $props();

	// Real-time updates
	onMount(() => {
		const socket = getSocket();
		if (!socket) return;
		socket.on('tournament:player-joined', () => invalidateAll());
		socket.on('tournament:player-left', () => invalidateAll());
		socket.on('tournament:started', () => invalidateAll());
		socket.on('tournament:finished', () => invalidateAll());
		socket.on('tournament:cancelled', () => invalidateAll());
		socket.on('tournament:list-updated', () => invalidateAll());
	});
	onDestroy(() => {
		const socket = getSocket();
		if (!socket) return;
		socket.off('tournament:player-joined');
		socket.off('tournament:player-left');
		socket.off('tournament:started');
		socket.off('tournament:finished');
		socket.off('tournament:cancelled');
		socket.off('tournament:list-updated');
	});

	// Filter: show open + in_progress together as "Active tournaments"
	let activeTournaments = $derived(
		data.tournaments.filter((t: any) => t.status === 'scheduled' || t.status === 'in_progress')
	);
	let finishedTournaments = $derived(
		data.tournaments.filter((t: any) => t.status === 'finished')
	);

	// Create modal state
	let showCreate = $state(false);
	let newName = $state('');
	let newMaxPlayers = $state(4);
	let newSpeed = $state('normal');
	let newWinScore = $state(5);
	let creating = $state(false);

	function createTournament() {
		if (!newName.trim()) return;
		const socket = getSocket();
		if (!socket?.connected) { toast.error('Not connected'); return; }
		creating = true;
		socket.emit('tournament:create', {
			name: newName.trim(),
			maxPlayers: newMaxPlayers,
			settings: { speedPreset: newSpeed, winScore: newWinScore },
		});
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

	function statusBadge(status: string): { label: string; class: string } {
		if (status === 'scheduled') return { label: 'OPEN', class: 'badge-open' };
		if (status === 'in_progress') return { label: 'IN PROGRESS', class: 'badge-active' };
		return { label: 'FINISHED', class: 'badge-finished' };
	}

	const speedOptions = [
		{ value: 'chill', label: 'Chill', emoji: '🐢' },
		{ value: 'normal', label: 'Normal', emoji: '🏓' },
		{ value: 'fast', label: 'Fast', emoji: '🔥' },
	];
	const scoreOptions = [
		{ value: 3, label: '3', sub: 'Quick' },
		{ value: 5, label: '5', sub: 'Standard' },
		{ value: 7, label: '7', sub: 'Long' },
		{ value: 11, label: '11', sub: 'Marathon' },
	];
	const playerOptions = [
		{ value: 4, label: '4 players', sub: '2 rounds', emoji: '⚡' },
		{ value: 8, label: '8 players', sub: '3 rounds', emoji: '🔥' },
		{ value: 16, label: '16 players', sub: '4 rounds', emoji: '💥' },
	];

</script>

<Starfield />
<!-- <NoiseGrain /> -->

<div class="page">
	<!-- Header -->
	<div class="page-header">
		<div>
			<h1 class="page-title">Tournaments</h1>
			<p class="page-sub">Compete in brackets, climb the ranks</p>
		</div>
		<button class="btn-create" onclick={() => showCreate = true}>+ Create</button>
	</div>

	<!-- Active tournament banner -->
	{#if data.myActiveTournament}
		<a href="/tournaments/{data.myActiveTournament.id}" class="active-banner">
			<div class="banner-left">
				<span class="banner-icon">⚔️</span>
				<div>
					<strong>You're in a tournament!</strong>
					<span class="banner-name">{data.myActiveTournament.name}</span>
				</div>
			</div>
			<div class="banner-right">
				<span class="badge badge-active">IN PROGRESS</span>
				<button class="btn-go">Go to match</button>
			</div>
		</a>
	{/if}

	<!-- Active tournaments -->
	{#if activeTournaments.length > 0}
		<section class="section">
			<div class="section-header">
				<h2 class="section-title">Active tournaments</h2>
				<span class="section-count">{activeTournaments.length} tournaments</span>
			</div>

			<div class="tournament-list">
				{#each activeTournaments as t}
					<a href="/tournaments/{t.id}" class="tournament-card">
						<div class="card-top">
							<h3 class="card-name">{t.name}</h3>
							<!-- should be add current round like semifinals or like QUARTERFINALS  -->
							<span class="badge {statusBadge(t.status).class}">{statusBadge(t.status).label}</span>
						</div>
						<div class="card-meta">
							<span class="meta-item">👥 {t.participantCount}/{t.maxPlayers}</span>
							<span class="meta-item">{speedEmoji(t.speedPreset)} {capitalize(t.speedPreset)}</span>
							<span class="meta-item">First to {t.winScore}</span>
							<span class="meta-item creator">
								<UserAvatar username={t.creatorUsername} size="xs" />
								{t.creatorUsername}
							</span>
						</div>
						{#if t.status === 'scheduled'}
							<button class="btn-card-action" onclick={(e) => { e.preventDefault(); e.stopPropagation(); goto(`/tournaments/${t.id}`); }}>
								Join
							</button>
						{:else}
							<button class="btn-card-action watch" onclick={(e) => { e.preventDefault(); e.stopPropagation(); goto(`/tournaments/${t.id}`); }}>
								Watch
							</button>
						{/if}
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Finished tournaments -->
	{#if finishedTournaments.length > 0}
		<section class="section">
			<h2 class="section-title">Recent results</h2>
			<div class="tournament-list">
				{#each finishedTournaments.slice(0, 5) as t}
					<a href="/tournaments/{t.id}" class="tournament-card finished-card">
						<div class="finished-row">
							<div class="finished-avatar-wrap">
								{#if t.winnerUsername}
									<UserAvatar username={t.winnerUsername} avatarUrl={t.winnerAvatarUrl} size="sm" />
									<span class="trophy-overlay">🏆</span>
								{:else}
									<span class="trophy-solo">🏆</span>
								{/if}
							</div>
							<div class="finished-info">
								<div class="finished-top-line">
									<h3 class="card-name">{t.name}</h3>
									{#if t.finishedAt}
										<span class="time-ago">{timeAgo(t.finishedAt)}</span>
									{/if}
								</div>
								<div class="finished-meta">
									<span>Won by {t.winnerUsername ?? 'unknown'}</span>
									<span class="meta-dot">&middot;</span>
									<span>{t.participantCount} players</span>
									<span class="meta-dot">&middot;</span>
									{#if t.myPlacement != null}
										<span>You: <strong>{ordinal(t.myPlacement)}</strong></span>
									{:else}
										<span class="didnt-participate">Didn't participate</span>
									{/if}
								</div>
							</div>
							{#if t.myXpEarned && t.myXpEarned > 0}
								<span class="xp-badge">+{t.myXpEarned} XP</span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Empty state -->
	{#if activeTournaments.length === 0 && finishedTournaments.length === 0}
		<div class="empty-state">
			<div class="empty-trophy">🏆</div>
			<h2 class="empty-title">No tournaments right now</h2>
			<p class="empty-text">Be the first to create one! Set up a bracket, invite friends, and compete for glory.</p>
			<button class="btn-create-empty" onclick={() => showCreate = true}>
				🏆 Create your first tournament
			</button>
		</div>
	{/if}
</div>

<!-- ═══ CREATE TOURNAMENT MODAL ═══ -->
{#if showCreate}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-overlay" onclick={() => showCreate = false}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<button class="modal-close" onclick={() => showCreate = false}>&times;</button>

			<div class="modal-header">
				<span class="modal-icon">🏆</span>
				<h2 class="modal-title">Create tournament</h2>
				<p class="modal-sub">Set up a bracket and invite players</p>
			</div>

			<!-- Tournament Name -->
			<div class="form-section">
				<span class="form-label">TOURNAMENT NAME</span>
				<input
					class="form-input"
					bind:value={newName}
					placeholder="Friday Night Pong"
					maxlength="100"
				/>
			</div>

			<!-- Players -->
			<div class="form-section">
				<span class="form-label">PLAYERS</span>
				<div class="option-grid cols-3">
					{#each playerOptions as opt}
						<button
							class="option-card"
							class:selected={newMaxPlayers === opt.value}
							onclick={() => newMaxPlayers = opt.value}
						>
							<span class="option-emoji">{opt.emoji}</span>
							<span class="option-main" class:highlight={newMaxPlayers === opt.value}>{opt.label}</span>
							<span class="option-sub">{opt.sub}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Ball Speed -->
			<div class="form-section">
				<span class="form-label">BALL SPEED</span>
				<div class="option-grid cols-3">
					{#each speedOptions as opt}
						<button
							class="option-card"
							class:selected={newSpeed === opt.value}
							onclick={() => newSpeed = opt.value}
						>
							<span class="option-emoji">{opt.emoji}</span>
							<span class="option-main" class:highlight={newSpeed === opt.value}>{opt.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- First To -->
			<div class="form-section">
				<span class="form-label">FIRST TO</span>
				<div class="option-grid cols-4">
					{#each scoreOptions as opt}
						<button
							class="option-card"
							class:selected={newWinScore === opt.value}
							onclick={() => newWinScore = opt.value}
						>
							<span class="option-main" class:highlight={newWinScore === opt.value}>{opt.label}</span>
							<span class="option-sub">{opt.sub}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Visibility private or public -->
			<!-- <div class="form-section">
				<span class="form-label">VISIBILITY</span>
				<div class="option-grid cols-2">
					<button
						class="option-card"
						class:selected={newVisibility === 'public'}
						onclick={() => newVisibility = 'public'}
					>
						<span class="option-emoji">🌐</span>
						<span class="option-main" class:highlight={newVisibility === 'public'}>Public</span>
						<span class="opt-sub">Anyone can join</span>
					</button>
					<button
						class="option-card"
						class:selected={newVisibility === 'private'}
						onclick={() => newVisibility = 'private'}
					>
						<span class="option-emoji">🔒</span>
						<span class="option-main" class:highlight={newVisibility === 'private'}>Friends only</span>
						<span class="opt-sub">Invite required</span>
					</button>
				</div>
			</div> -->

			<!-- Create Button -->
			<button
				class="btn-create-tournament"
				onclick={createTournament}
				disabled={creating || !newName.trim()}
			>
				🏆 {creating ? 'Creating...' : 'Create tournament'}
			</button>

			<p class="create-note">You'll be automatically added as the first player</p>
		</div>
	</div>
{/if}

<style>
	.page {
		max-width: 700px;
		margin: 0 auto;
		padding: 2rem 1rem;
		position: relative;
		z-index: 1;
	}

	/* ── Header ─────────────────────────── */
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
	}

	.page-title {
		font-size: 1.8rem;
		font-weight: 800;
		margin: 0;
		color: #f3f4f6;
	}

	.page-sub {
		font-size: 0.85rem;
		color: #6b7280;
		margin: 0.2rem 0 0;
	}

	.btn-create {
		background: #ff6b9d;
		color: #fff;
		border: none;
		padding: 0.6rem 1.2rem;
		border-radius: 0.5rem;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
		white-space: nowrap;
	}
	.btn-create:hover { background: #ff85b1; transform: scale(1.02); }

	/* ── Active Banner ──────────────────── */
	.active-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		background: rgba(255, 107, 157, 0.06);
		border: 1px solid rgba(255, 107, 157, 0.2);
		border-radius: 0.75rem;
		margin-bottom: 1.5rem;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s;
	}
	.active-banner:hover { border-color: rgba(255, 107, 157, 0.4); }

	.banner-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.banner-icon { font-size: 1.2rem; }

	.banner-left strong {
		display: block;
		font-size: 0.9rem;
		color: #f3f4f6;
	}

	.banner-name {
		display: block;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.banner-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.btn-go {
		background: #ff6b9d;
		color: #fff;
		border: none;
		padding: 0.45rem 1rem;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 0.8rem;
		cursor: pointer;
		font-family: inherit;
	}

	/* ── Sections ───────────────────────── */
	.section {
		margin-bottom: 2rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.section-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: #f3f4f6;
		margin: 0.8rem 0;
	}

	.section-count {
		font-size: 0.75rem;
		color: #6b7280;
	}

	/* ── Tournament Cards ───────────────── */
	.tournament-list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.tournament-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s, background 0.15s;
		position: relative;
	}
	.tournament-card:hover {
		border-color: rgba(255, 107, 157, 0.25);
		background: rgba(255, 255, 255, 0.04);
	}

	.card-top {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.card-name {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: #f3f4f6;
	}

	.badge {
		font-size: 0.55rem;
		font-weight: 700;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.badge-open { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
	.badge-active { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
	.badge-finished { background: rgba(255, 255, 255, 0.08); color: #6b7280; }

	.card-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		font-size: 0.75rem;
		color: #6b7280;
		align-items: center;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.meta-item.creator {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.btn-card-action {
		position: absolute;
		right: 1.25rem;
		top: 50%;
		transform: translateY(-50%);
		background: transparent;
		border: 1px solid rgba(255, 107, 157, 0.3);
		color: #ff6b9d;
		padding: 0.35rem 1rem;
		border-radius: 0.4rem;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
	}
	.btn-card-action:hover {
		background: rgba(255, 107, 157, 0.1);
	}
	.btn-card-action.watch {
		border-color: rgba(255, 255, 255, 0.1);
		color: #9ca3af;
	}
	.btn-card-action.watch:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.finished-card {
		flex-direction: row !important;
		padding: 0.85rem 1.25rem;
	}

	.finished-row {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		width: 100%;
	}

	.finished-avatar-wrap {
		position: relative;
		flex-shrink: 0;
	}

	.trophy-overlay {
		position: absolute;
		bottom: -4px;
		right: -6px;
		font-size: 0.7rem;
		filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
	}

	.trophy-solo {
		font-size: 1.4rem;
		opacity: 0.5;
	}

	.finished-info {
		flex: 1;
		min-width: 0;
	}

	.finished-top-line {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.finished-top-line .card-name {
		font-size: 0.95rem;
	}

	.time-ago {
		font-size: 0.7rem;
		color: #4b5563;
		white-space: nowrap;
	}

	.finished-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.15rem;
	}

	.finished-meta strong {
		color: #f3f4f6;
	}

	.meta-dot {
		color: #374151;
	}

	.didnt-participate {
		font-style: italic;
		color: #4b5563;
	}

	.xp-badge {
		font-size: 0.8rem;
		font-weight: 700;
		color: #4ade80;
		white-space: nowrap;
		flex-shrink: 0;
	}

	/* ── Empty State ─────────────────────── */
	.empty-state {
		text-align: center;
		padding: 4rem 1rem;
	}

	.empty-trophy {
		font-size: 3rem;
		opacity: 0.4;
		margin-bottom: 1rem;
	}

	.empty-title {
		font-size: 1.2rem;
		font-weight: 700;
		color: #f3f4f6;
		margin: 0 0 0.5rem;
	}

	.empty-text {
		font-size: 0.85rem;
		color: #6b7280;
		margin: 0 0 1.5rem;
		max-width: 350px;
		margin-left: auto;
		margin-right: auto;
	}

	.btn-create-empty {
		background: #ff6b9d;
		color: #fff;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 0.6rem;
		font-weight: 700;
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
	}
	.btn-create-empty:hover { background: #ff85b1; }

	/* ═══════════════════════════════════════
	   CREATE MODAL
	   ═══════════════════════════════════════ */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.modal {
		background: #161628;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1rem;
		padding: 1.75rem;
		width: 100%;
		max-width: 480px;
		max-height: 90vh;
		overflow-y: auto;
		position: relative;
	}

	.modal-close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: none;
		border: none;
		color: #6b7280;
		font-size: 1.2rem;
		cursor: pointer;
		padding: 0.25rem;
		line-height: 1;
	}
	.modal-close:hover { color: #f3f4f6; }

	.modal-header {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.modal-icon {
		font-size: 2rem;
		display: block;
		margin-bottom: 0.3rem;
	}

	.modal-title {
		font-size: 1.3rem;
		font-weight: 800;
		color: #f3f4f6;
		margin: 0;
	}

	.modal-sub {
		font-size: 0.8rem;
		color: #6b7280;
		margin: 0.2rem 0 0;
	}

	/* ── Form Sections ──────────────────── */
	.form-section {
		margin-bottom: 1.25rem;
	}

	.form-label {
		display: block;
		font-size: 0.65rem;
		font-weight: 700;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: 0.5rem;
	}

	.form-input {
		width: 100%;
		padding: 0.7rem 0.9rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
		color: #f3f4f6;
		font-size: 0.95rem;
		font-family: inherit;
		outline: none;
		box-sizing: border-box;
	}
	.form-input:focus { border-color: rgba(255, 107, 157, 0.4); }
	.form-input::placeholder { color: #4b5563; }

	/* ── Option Grid ────────────────────── */
	.option-grid {
		display: grid;
		gap: 0.5rem;
	}
	.option-grid.cols-2 { grid-template-columns: 1fr 1fr; }
	.option-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
	.option-grid.cols-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }

	.option-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.75rem 0.5rem;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.6rem;
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
		color: #9ca3af;
	}

	.option-card:hover {
		border-color: rgba(255, 255, 255, 0.15);
	}

	.option-card.selected {
		border-color: rgba(255, 107, 157, 0.5);
		background: rgba(255, 107, 157, 0.04);
	}

	.option-emoji {
		font-size: 1.2rem;
	}

	.option-main {
		font-size: 0.85rem;
		font-weight: 600;
		color: #d1d5db;
	}

	.option-main.highlight {
		color: #ff6b9d;
	}

	.option-sub {
		font-size: 0.65rem;
		color: #6b7280;
	}

	/* ── Create Button ──────────────────── */
	.btn-create-tournament {
		width: 100%;
		padding: 0.85rem;
		background: #ff6b9d;
		color: #fff;
		border: none;
		border-radius: 0.6rem;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
		margin-top: 0.5rem;
	}
	.btn-create-tournament:hover:not(:disabled) { background: #ff85b1; }
	.btn-create-tournament:disabled { opacity: 0.4; cursor: not-allowed; }

	.create-note {
		text-align: center;
		font-size: 0.7rem;
		color: #4b5563;
		margin: 0.6rem 0 0;
	}

	/* ── Responsive ──────────────────────── */
	@media (max-width: 500px) {
		.active-banner { flex-direction: column; gap: 0.75rem; align-items: flex-start; }
		.banner-right { align-self: flex-end; }
		.option-grid.cols-4 { grid-template-columns: 1fr 1fr; }
	}
</style>
