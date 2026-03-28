<script lang="ts">
	import { speedEmoji } from '$lib/utils/format_game';
	import { capitalize } from '$lib/utils/format_progression';
	import UserAvatar from '../UserAvatar.svelte';

	type Props = {
		tournamentName: string;
		participants: Array<{
			userId: number;
			username: string;
			name: string | null;
			avatarUrl: string | null;
			wins: number | null;
			seed: number | null;
			status: string;
		}>;
		maxPlayers: number;
		speedPreset: string;
		winScore: number;
		isCreator: boolean;
		isParticipant: boolean;
		currentUserId: number;
		onJoin: () => void;
		onLeave: () => void;
		onStart: () => void;
		onCancel: () => void;
	};

	let {
		tournamentName, participants, maxPlayers, speedPreset, winScore,
		isCreator, isParticipant, currentUserId,
		onJoin, onLeave, onStart, onCancel,
	}: Props = $props();

	let rounds = $derived(Math.log2(maxPlayers));
	let isFull = $derived(participants.length >= maxPlayers);
	let canStart = $derived(isCreator && participants.length >= 2);

	// Auto-start countdown when lobby is full
	let countdown = $state<number | null>(null);
	let countdownInterval = $state<ReturnType<typeof setInterval> | null>(null);

	$effect(() => {
		if (isFull && !countdownInterval) {
			countdown = 10;
			countdownInterval = setInterval(() => {
				if (countdown !== null && countdown > 1) {
					countdown--;
				} else {
					// Countdown finished — auto-start
					if (countdownInterval) clearInterval(countdownInterval);
					countdownInterval = null;
					countdown = null;
					onStart();
				}
			}, 1000);
		} else if (!isFull && countdownInterval) {
			// Player left during countdown — cancel
			clearInterval(countdownInterval);
			countdownInterval = null;
			countdown = null;
		}

		return () => {
			if (countdownInterval) clearInterval(countdownInterval);
		};
	});

	// Sort: current user first, then by seed
	let sortedParticipants = $derived(
		[...participants].sort((a, b) => {
			if (a.userId === currentUserId) return -1;
			if (b.userId === currentUserId) return 1;
			return (a.seed ?? 99) - (b.seed ?? 99);
		})
	);

	let emptySlots = $derived(Math.max(0, maxPlayers - participants.length));
</script>

<div class="lobby">
	<!-- Header -->
	<div class="lobby-header">
		<span class="tournament-label">TOURNAMENT</span>
		<h1 class="tournament-name">{tournamentName}</h1>
		<p class="tournament-settings">
			{maxPlayers}-player single elimination · {speedEmoji(speedPreset)} {capitalize(speedPreset)} · First to {winScore}
		</p>
	</div>

	<!-- Stats Bar -->
	<div class="stats-bar">
		<div class="stat">
			<span class="stat-value">{participants.length}/{maxPlayers}</span>
			<span class="stat-label">PLAYERS</span>
		</div>
		<div class="stat">
			<span class="stat-value" class:countdown-active={countdown !== null}>
				{countdown !== null ? `0:${String(countdown).padStart(2, '0')}` : '—'}
			</span>
			<span class="stat-label">STARTS IN</span>
		</div>
		<div class="stat">
			<span class="stat-value">{rounds}</span>
			<span class="stat-label">ROUNDS</span>
		</div>
	</div>

	<!-- Players Grid -->
	<div class="players-section">
		<div class="players-header">
			<span class="players-title">Players</span>
			<span class="players-count">{participants.length} of {maxPlayers} joined</span>
		</div>

		<div class="players-grid">
			{#each sortedParticipants as p}
				<div class="player-card" class:is-you={p.userId === currentUserId}>
					<UserAvatar avatarUrl={p.avatarUrl} username={p.username} size="sm" />
					<div class="player-info">
						<span class="player-name">
							{p.name ?? p.username}
							{#if p.userId === currentUserId}
								<span class="you-label">(you)</span>
							{/if}
						</span>
						<span class="player-wins">{p.wins ?? 0} wins</span>
					</div>
					{#if p.userId === currentUserId && isParticipant}
						<span class="joined-badge">JOINED</span>
					{/if}
				</div>
			{/each}

			{#each Array(emptySlots) as _}
				<div class="player-card empty">
					<span class="waiting-text">Waiting for player...</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Actions -->
	<div class="lobby-actions">
		{#if isCreator}
			<button class="btn btn-cancel" onclick={onCancel}>Cancel</button>
		{:else if isParticipant}
			<button class="btn btn-leave" onclick={onLeave}>Leave</button>
		{:else}
			<button class="btn btn-join" onclick={onJoin}>Join Tournament</button>
		{/if}

		{#if canStart}
			<button class="btn btn-start" onclick={onStart}>
				Start Tournament
			</button>
		{:else}
			<button class="btn btn-waiting" disabled>
				Waiting for players...
			</button>
		{/if}
	</div>

	<p class="auto-start-note">
		Tournament starts automatically when all {maxPlayers} players join
	</p>
</div>

<style>
	.lobby {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 16px;
		padding: 2rem 1.5rem;
		max-width: 640px;
		margin: 0 auto;
	}

	/* ── Header ─────────────────────────── */
	.lobby-header {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.tournament-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: #ff6b9d;
	}

	.tournament-name {
		font-size: 1.6rem;
		font-weight: 800;
		color: #f3f4f6;
		margin: 0.25rem 0 0.4rem;
	}

	.tournament-settings {
		font-size: 0.8rem;
		color: #6b7280;
		margin: 0;
	}

	/* ── Stats Bar ──────────────────────── */
	.stats-bar {
		display: flex;
		justify-content: center;
		gap: 2rem;
		padding: 0.85rem 1.5rem;
		margin-bottom: 1.5rem;
		border-radius: 0.65rem;
		border: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(255, 255, 255, 0.02);
	}

	.stat {
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: 1.1rem;
		font-weight: 700;
		color: #f3f4f6;
	}

	.stat-value.countdown-active {
		color: #fbbf24;
	}

	.stat-label {
		display: block;
		font-size: 0.55rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-top: 0.15rem;
	}

	/* ── Players ────────────────────────── */
	.players-section {
		margin-bottom: 1.25rem;
	}

	.players-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.6rem;
	}

	.players-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: #f3f4f6;
	}

	.players-count {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.players-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.player-card {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.65rem 0.85rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.6rem;
		min-height: 52px;
	}

	.player-card.is-you {
		border-color: rgba(74, 222, 128, 0.2);
		background: rgba(74, 222, 128, 0.04);
	}

	.player-card.empty {
		border-style: dashed;
		border-color: rgba(255, 255, 255, 0.08);
		background: transparent;
		justify-content: center;
	}

	.player-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
		flex: 1;
	}

	.player-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: #f3f4f6;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.you-label {
		color: #fbbf24;
		font-weight: 500;
		font-size: 0.75rem;
	}

	.player-wins {
		font-size: 0.7rem;
		color: #6b7280;
	}

	.joined-badge {
		font-size: 0.55rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.2rem 0.5rem;
		border-radius: 999px;
		background: rgba(74, 222, 128, 0.12);
		color: #4ade80;
		white-space: nowrap;
	}

	.waiting-text {
		font-size: 0.75rem;
		color: #4b5563;
		font-style: italic;
	}

	/* ── Actions ─────────────────────────── */
	.lobby-actions {
		display: flex;
		gap: 0.6rem;
		margin-bottom: 0.75rem;
	}

	.btn {
		flex: 1;
		padding: 0.75rem;
		border-radius: 0.6rem;
		font-size: 0.9rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn:hover:not(:disabled) { transform: scale(1.02); }

	.btn-join {
		background: #ff6b9d;
		color: #fff;
		border: none;
	}
	.btn-join:hover { background: #ff85b1; }

	.btn-cancel,
	.btn-leave {
		background: transparent;
		border: 1px solid rgba(248, 113, 113, 0.3);
		color: #f87171;
	}
	.btn-cancel:hover,
	.btn-leave:hover {
		background: rgba(248, 113, 113, 0.08);
	}

	.btn-start {
		background: #ff6b9d;
		color: #fff;
		border: none;
	}
	.btn-start:hover { background: #ff85b1; }

	.btn-waiting {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		color: #4b5563;
		cursor: not-allowed;
	}

	.auto-start-note {
		text-align: center;
		font-size: 0.7rem;
		color: #4b5563;
		margin: 0;
	}

	/* ── Responsive ──────────────────────── */
	@media (max-width: 500px) {
		.players-grid {
			grid-template-columns: 1fr;
		}
		.stats-bar {
			gap: 1.25rem;
		}
		.lobby {
			padding: 1.5rem 1rem;
		}
	}
</style>
