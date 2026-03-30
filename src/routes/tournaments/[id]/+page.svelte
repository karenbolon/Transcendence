<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { getSocket } from '$lib/stores/socket.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { onMount, onDestroy } from 'svelte';
	import Bracket from '$lib/component/tournament/Bracket.svelte';
	import TournamentLobby from '$lib/component/tournament/TournamentLobby.svelte';
	import UserAvatar from '$lib/component/common/UserAvatar.svelte';
	import { speedEmoji } from '$lib/utils/format_game';
	import { timeAgo, ordinal } from '$lib/utils/format_date';
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

	function handleCancel() {
		const socket = getSocket();
		if (!socket?.connected) { toast.error('Not connected'); return; }
		socket.emit('tournament:cancel', { tournamentId: tournament.id });
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
		// tournament:cancelled is handled globally in +layout.svelte
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
				invalidateAll(); // Reload participants with final placements
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

	// Podium: top 3 participants sorted by placement
	let podium = $derived.by(() => {
		if (tournament.status !== 'finished') return [];
		return [...participants]
			.filter((p: any) => p.placement !== null && p.placement <= 3)
			.sort((a: any, b: any) => a.placement - b.placement);
	});

	// Current user's participant data
	let myParticipant = $derived(
		participants.find((p: any) => p.userId === data.userId) ?? null
	);

	// Derive W/L from bracket data
	let myRecord = $derived.by(() => {
		if (!bracket || !myParticipant) return { wins: 0, losses: 0 };
		let wins = 0, losses = 0;
		for (const round of bracket) {
			for (const match of round.matches) {
				if (match.status !== 'finished' || !match.winnerId) continue;
				if (match.player1Id === data.userId || match.player2Id === data.userId) {
					if (match.winnerId === data.userId) wins++;
					else losses++;
				}
			}
		}
		return { wins, losses };
	});

	function playerRecord(userId: number): { wins: number; losses: number } {
		if (!bracket) return { wins: 0, losses: 0 };
		let wins = 0, losses = 0;
		for (const round of bracket) {
			for (const match of round.matches) {
				if (match.status !== 'finished' || !match.winnerId) continue;
				if (match.player1Id === userId || match.player2Id === userId) {
					if (match.winnerId === userId) wins++;
					else losses++;
				}
			}
		}
		return { wins, losses };
	}
</script>

<Starfield />
<!-- <NoiseGrain /> -->

<div class="page">
	<a href="/tournaments" class="back-link">← Tournaments</a>
	<div class="header">
		<div class="title-row">
			<h1 class="title">{tournament.name}</h1>
			<span class="status status-{tournament.status}">{statusLabel(tournament.status)}</span>
		</div>
	</div>

	{#if tournament.speedPreset}
		<div class="info-bar">
			<span class="info-item">{speedEmoji(tournament.speedPreset)} <strong>{tournament.speedPreset}</strong></span>
			<span class="info-item">🎯 First to <strong>{tournament.winScore}</strong></span>
			<span class="info-item">👥 <strong>{participants.length}</strong> players</span>
			{#if tournament.finishedAt}
				<span class="info-item">📅 <strong>{timeAgo(tournament.finishedAt)}</strong></span>
			{:else if tournament.startedAt}
				<span class="info-item">📅 Started <strong>{timeAgo(tournament.startedAt)}</strong></span>
			{/if}
		</div>
	{/if}

	{#if tournament.status === 'finished' && podium.length > 0}
		{@const first = podium.find((p: any) => p.placement === 1)}
		{@const second = podium.find((p: any) => p.placement === 2)}
		{@const thirds = podium.filter((p: any) => p.placement === 3)}
		<div class="podium-section">
			<div class="podium">
				<!-- 2nd place (left) -->
				{#if second}
					<div class="podium-entry second">
						<div class="podium-avatar silver-ring">
							<UserAvatar username={second.username} displayName={second.name} avatarUrl={second.avatarUrl} size="lg" />
						</div>
						<span class="podium-name">{second.name ?? second.username}</span>
						<span class="podium-place silver">2nd Place 🥈</span>
						<div class="podium-block silver-block">2</div>
					</div>
				{/if}

				<!-- 1st place (center, tallest) -->
				{#if first}
					<div class="podium-entry first">
						<span class="crown">👑</span>
						<div class="podium-avatar gold-ring">
							<UserAvatar username={first.username} displayName={first.name} avatarUrl={first.avatarUrl} size="xl" />
						</div>
						<span class="podium-name">{first.name ?? first.username}</span>
						<span class="podium-place gold">1st Place</span>
						<div class="podium-block gold-block">1</div>
					</div>
				{/if}

				<!-- 3rd place (right) — can be multiple (tied semifinal losers) -->
				{#if thirds.length > 0}
					<div class="podium-entry third">
						<div class="podium-avatars-group">
							{#each thirds as p3}
								<div class="podium-avatar-stacked">
									<div class="podium-avatar bronze-ring">
										<UserAvatar username={p3.username} displayName={p3.name} avatarUrl={p3.avatarUrl} size={thirds.length > 1 ? 'md' : 'lg'} />
									</div>
									<span class="podium-name">{p3.name ?? p3.username}</span>
								</div>
							{/each}
						</div>
						<span class="podium-place bronze">3rd Place 🥉</span>
						<div class="podium-block bronze-block">3</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if tournament.status === 'finished' && myParticipant && myParticipant.placement}
		<div class="your-run">
			<div class="your-run-title">Your tournament run</div>
			<div class="your-run-stats">
				<div>
					<span class="yr-value">{ordinal(myParticipant.placement)}</span>
					<span class="yr-label">Place</span>
				</div>
				<div>
					<span class="yr-value green">{myRecord.wins}</span>
					<span class="yr-label">Wins</span>
				</div>
				<div>
					<span class="yr-value red">{myRecord.losses}</span>
					<span class="yr-label">Losses</span>
				</div>
				{#if myParticipant.xpEarned > 0}
					<div>
						<span class="yr-value green">+{myParticipant.xpEarned}</span>
						<span class="yr-label">XP Earned</span>
					</div>
				{/if}
				{#if myParticipant.seed}
					<div>
						<span class="yr-value">#{myParticipant.seed}</span>
						<span class="yr-label">Seed</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if tournament.status === 'scheduled'}
		<TournamentLobby
			tournamentName={tournament.name}
			{participants}
			maxPlayers={tournament.maxPlayers}
			speedPreset={tournament.speedPreset}
			winScore={tournament.winScore}
			{isCreator}
			{isParticipant}
			currentUserId={data.userId}
			onJoin={handleJoin}
			onLeave={handleLeave}
			onStart={handleStart}
			onCancel={handleCancel}
		/>
	{/if}

	{#if bracket && bracket.length > 0}
		<div class="bracket-section">
			<h2 class="section-title">Bracket</h2>
			<Bracket {bracket} currentUserId={data.userId} tournamentName={tournament.name} currentRound={tournament.currentRound ?? 1} />
		</div>
	{/if}

	{#if tournament.status !== 'scheduled' && participants.length > 0}
		<div class="participants-section">
			<h2 class="section-title">Participants</h2>
			<div class="participants-list">
				{#each [...participants].sort((a, b) => (a.placement ?? 999) - (b.placement ?? 999)) as p}
					{@const record = playerRecord(p.userId)}
					<a href={p.userId === data.userId ? undefined : `/friends/${p.userId}`} class="participant-row" class:is-you={p.userId === data.userId} class:clickable={p.userId !== data.userId}>
						<span class="p-rank" class:gold={p.placement === 1} class:silver={p.placement === 2} class:bronze={p.placement === 3}>
							{p.placement ? `#${p.placement}` : '-'}
						</span>
						<UserAvatar username={p.username} displayName={p.name} avatarUrl={p.avatarUrl} size="xs" />
						<span class="p-name">
							{p.name ?? p.username}
							{#if p.userId === data.userId}<span class="you-tag">(you)</span>{/if}
						</span>
						<span class="p-record">
							<span class="rec-wins">{record.wins}W</span>
							<span class="rec-losses">{record.losses}L</span>
						</span>
						{#if p.status === 'champion'}
							<span class="p-badge champion-badge">1st Place</span>
						{:else if p.placement === 2}
							<span class="p-badge silver-badge">2nd Place</span>
						{:else if p.placement === 3}
							<span class="p-badge bronze-badge">3rd Place</span>
						{:else if p.status === 'eliminated' && p.placement}
							<span class="p-badge elim-badge">{ordinal(p.placement)} Place</span>
						{:else if p.status === 'eliminated'}
							<span class="p-badge elim-badge">Eliminated</span>
						{:else if p.status === 'active'}
							<span class="p-badge active-badge">Active</span>
						{/if}
					</a>
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
	.back-link {
		display: block;
		color: #6b7280;
		text-decoration: none;
		font-size: 0.8rem;
		transition: color 0.15s;
		margin-bottom: 8px;
	}
	.back-link:hover { color: #f3f4f6; }

	.header {
		margin-bottom: 24px;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.title {
		font-size: 1.6rem;
		font-weight: 800;
		margin: 0;
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

	/* ── Info Bar ───────────────────────── */
	.info-bar {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		padding: 0.75rem 1.25rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.65rem;
		margin-bottom: 24px;
	}

	.info-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		color: #9ca3af;
	}

	.info-item strong {
		color: #d1d5db;
		font-weight: 600;
		text-transform: capitalize;
	}

	/* ── Your Run Card ──────────────────── */
	.your-run {
		max-width: 420px;
		margin: 0 auto 32px;
		padding: 1rem 1.5rem;
		background: rgba(255, 107, 157, 0.04);
		border: 1px solid rgba(255, 107, 157, 0.15);
		border-radius: 0.75rem;
	}

	.your-run-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: #ff6b9d;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	.your-run-stats {
		display: flex;
		justify-content: space-around;
		text-align: center;
	}

	.yr-value {
		display: block;
		font-size: 1.1rem;
		font-weight: 800;
		color: #f3f4f6;
	}

	.yr-value.green { color: #4ade80; }
	.yr-value.red { color: #f87171; }

	.yr-label {
		display: block;
		font-size: 0.6rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-top: 0.1rem;
	}

	/* ── Podium ──────────────────────────── */
	.podium-section {
		margin-bottom: 32px;
	}

	.podium {
		display: flex;
		justify-content: center;
		align-items: flex-end;
		gap: 12px;
	}

	.podium-entry {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	.podium-entry.first {
		order: 2;
	}
	.podium-entry.second {
		order: 1;
	}
	.podium-entry.third {
		order: 3;
	}

	.crown {
		font-size: 1.6rem;
		animation: crown-bob 2s ease-in-out infinite;
	}

	@keyframes crown-bob {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-4px); }
	}

	.podium-avatar {
		border-radius: 50%;
		padding: 3px;
	}

	.gold-ring {
		background: linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24);
		box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
	}

	.silver-ring {
		background: linear-gradient(135deg, #d1d5db, #9ca3af, #d1d5db);
		box-shadow: 0 0 12px rgba(192, 192, 192, 0.2);
	}

	.bronze-ring {
		background: linear-gradient(135deg, #cd7f32, #b8702e, #cd7f32);
		box-shadow: 0 0 12px rgba(205, 127, 50, 0.2);
	}

	.podium-avatars-group {
		display: flex;
		gap: 8px;
		align-items: flex-end;
	}

	.podium-avatar-stacked {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.podium-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: #f3f4f6;
		max-width: 100px;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.podium-place {
		font-size: 0.7rem;
		font-weight: 600;
	}

	.podium-place.gold { color: #fbbf24; }
	.podium-place.silver { color: #c0c0c0; }
	.podium-place.bronze { color: #cd7f32; }

	.podium-block {
		width: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px 6px 0 0;
		font-size: 1.2rem;
		font-weight: 800;
		color: rgba(0, 0, 0, 0.3);
	}

	.gold-block {
		height: 80px;
		background: linear-gradient(180deg, rgba(251, 191, 36, 0.3), rgba(251, 191, 36, 0.1));
		border: 1px solid rgba(251, 191, 36, 0.3);
		border-bottom: none;
	}

	.silver-block {
		height: 56px;
		background: linear-gradient(180deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.06));
		border: 1px solid rgba(192, 192, 192, 0.2);
		border-bottom: none;
	}

	.bronze-block {
		height: 40px;
		background: linear-gradient(180deg, rgba(205, 127, 50, 0.2), rgba(205, 127, 50, 0.06));
		border: 1px solid rgba(205, 127, 50, 0.15);
		border-bottom: none;
	}

	.bracket-section, .participants-section {
		margin-top: 32px;
	}
	.section-title {
		font-size: 1.1rem;
		margin: 0 0 16px;
		color: #ccc;
	}

	.participants-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.participant-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.6rem;
		font-size: 0.85rem;
		text-decoration: none;
		color: inherit;
	}

	.participant-row.clickable {
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.participant-row.clickable:hover {
		border-color: rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
	}

	.participant-row.is-you {
		border-color: rgba(255, 107, 157, 0.2);
		background: rgba(255, 107, 157, 0.04);
		cursor: default;
	}

	.p-rank {
		font-size: 0.75rem;
		font-weight: 700;
		color: #4b5563;
		min-width: 28px;
		text-align: center;
	}

	.p-rank.gold { color: #fbbf24; }
	.p-rank.silver { color: #94a3b8; }
	.p-rank.bronze { color: #d97706; }

	.p-name {
		flex: 1;
		font-weight: 600;
		color: #d1d5db;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.you-tag {
		font-size: 0.65rem;
		color: #ff6b9d;
		font-weight: 500;
		margin-left: 0.3rem;
	}

	.p-record {
		display: flex;
		gap: 0.5rem;
		font-size: 0.7rem;
		color: #6b7280;
	}

	.rec-wins { color: #4ade80; }
	.rec-losses { color: #f87171; }

	.p-badge {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 4px;
		margin-left: auto;
		white-space: nowrap;
	}
	.champion-badge { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
	.silver-badge { background: rgba(192, 192, 192, 0.15); color: #c0c0c0; }
	.bronze-badge { background: rgba(205, 127, 50, 0.15); color: #cd7f32; }
	.elim-badge { background: rgba(255, 255, 255, 0.08); color: #888; }
	.active-badge { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
</style>
