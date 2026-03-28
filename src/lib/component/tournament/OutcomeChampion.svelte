<script lang="ts">
	import { formatDuration } from '$lib/utils/format_date';
	import { speedEmoji } from '$lib/utils/format_game';
	import UserAvatar from '../UserAvatar.svelte';

	type Props = {
		myScore: number;
		opponentScore: number;
		opponentUsername: string;
		opponentDisplayName?: string | null;
		opponentAvatarUrl: string | null;
		myUsername: string;
		myDisplayName?: string | null;
		myAvatarUrl: string | null;
		durationSeconds: number;
		speedPreset: string;
		tournamentName: string;
		round: number;
		totalRounds: number;
		roundName: string;
		podium?: { username: string; displayName?: string | null; avatarUrl: string | null; placement: number }[];
		championWins?: number;
		championTotalTime?: number;
		championXpEarned?: number;
		newBadges?: { emoji: string; name: string }[];
		onViewBracket: () => void;
		onBackToLobby: () => void;
	};

	let {
		myUsername, myDisplayName = null, myAvatarUrl,
		tournamentName,
		podium = [], championWins = 0, championTotalTime = 0, championXpEarned = 0,
		newBadges = [],
		onViewBracket, onBackToLobby,
	}: Props = $props();
</script>

<div class="result-icon trophy">🏆</div>
<div class="result-label champion">TOURNAMENT CHAMPION</div>
<h1 class="result-text">{tournamentName}</h1>

<div class="champion-avatar">
	<span class="crown">👑</span>
	<div class="avatar-wrap champion-ring">
		<UserAvatar avatarUrl={myAvatarUrl} username={myUsername} displayName={myDisplayName} size="xxl" />
	</div>
	<span class="champion-name">{myUsername}</span>
	<span class="champion-place">1st Place</span>
</div>

{#if podium.length > 1}
	<div class="podium">
		{#each podium.filter(p => p.placement > 1).sort((a, b) => a.placement - b.placement) as p}
			<div class="podium-entry">
				<div class="avatar-wrap podium-ring-{p.placement}">
					<UserAvatar avatarUrl={p.avatarUrl} username={p.username} displayName={p.displayName} size="lg" />
				</div>
				<span class="podium-name">{p.username}</span>
				<span class="podium-place">
					{p.placement === 2 ? '2nd Place 🥈' : '3rd Place 🥉'}
				</span>
			</div>
		{/each}
	</div>
{/if}

<div class="stats-row">
	<div class="stat">
		<span class="stat-value wins">{championWins}</span>
		<span class="stat-label">WINS</span>
	</div>
	<div class="stat">
		<span class="stat-value">0</span>
		<span class="stat-label">LOSSES</span>
	</div>
	<div class="stat">
		<span class="stat-value xp">+{championXpEarned}</span>
		<span class="stat-label">XP EARNED</span>
	</div>
</div>

{#if newBadges.length > 0}
	<div class="badges">
		{#each newBadges as badge, i}
			<div class="badge" style="animation-delay: {i * 0.15}s">
				<span class="badge-emoji">{badge.emoji}</span>
				<span class="badge-name">{badge.name}</span>
			</div>
		{/each}
	</div>
{/if}

<div class="actions">
	<button class="btn btn-primary" onclick={onViewBracket}>
		View bracket
	</button>
	<button class="btn btn-secondary" onclick={onBackToLobby}>
		← Lobby
	</button>
</div>

<style>
	.result-icon {
		font-size: 3.5rem;
		margin-bottom: 0.8rem;
	}

	.result-icon.trophy {
		font-size: 3rem;
	}

	.result-label {
		font-size: 1.45rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		margin-bottom: 0.25rem;
	}

	.result-label.champion { color: #fbbf24; }

	.result-text {
		font-size: 1.65em;
		font-weight: 800;
		color: #f3f4f6;
		margin: 0 0 0.25rem 0;
	}

	.champion-avatar {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		margin-bottom: 1rem;
		position: relative;
	}

	.crown {
		font-size: 2.3rem;
		margin-bottom: -0.3rem;
		animation: crown-bounce 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
		animation-delay: 0.3s;
	}

	.avatar-wrap {
		border-radius: 50%;
		overflow: hidden;
		border: 3px solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar-wrap.champion-ring {
		border-color: #fbbf24;
		box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
	}

	.avatar-wrap.podium-ring-2 {
		border-color: #94a3b8;
	}

	.avatar-wrap.podium-ring-3 {
		border-color: #d97706;
	}

	.champion-name {
		font-size: 1.5rem;
		font-weight: 700;
		color: #f3f4f6;
	}

	.champion-place {
		font-size: 0.85rem;
		color: #6b7280;
	}

	.podium {
		display: flex;
		justify-content: center;
		gap: 6.5rem;
		margin-bottom: 1.5rem;
	}

	.podium-entry {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}

	.podium-name {
		font-size: 1.2rem;
		font-weight: 600;
		color: #d1d5db;
	}

	.podium-place {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.stats-row {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		margin-bottom: 1.25rem;
		padding: 0.85rem 1.5rem;
		border-radius: 0.65rem;
		background: rgba(255, 255, 255, 0.025);
		border: 1px solid rgba(255, 255, 255, 0.04);
		width: 110%;
		max-width: 660px;
	}

	.stat { text-align: center; }

	.stat-value {
		display: block;
		font-size: 0.98rem;
		font-weight: 700;
		color: #d1d5db;
	}

	.stat-value.xp { color: #4ade80; }
	.stat-value.wins { color: #4ade80; }

	.stat-label {
		display: block;
		font-size: 0.75rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-top: 0.1rem;
	}

	.badges {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.badge {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.75rem;
		background: rgba(251, 191, 36, 0.08);
		border: 1px solid rgba(251, 191, 36, 0.2);
		border-radius: 999px;
		animation: badge-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.badge-emoji { font-size: 0.9rem; }
	.badge-name { font-size: 0.75rem; font-weight: 600; color: #fbbf24; }

	.actions {
		display: flex;
		gap: 0.6rem;
		width: 110%;
		max-width: 660px;
	}

	.btn {
		flex: 1;
		padding: 0.8rem;
		border-radius: 0.6rem;
		font-size: 0.9rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
	}

	.btn:hover { transform: scale(1.02); }

	.btn-primary {
		background: #ff6b9d;
		color: #fff;
		border: none;
	}

	.btn-primary:hover { background: #ff85b1; }

	.btn-secondary {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: #9ca3af;
	}

	.btn-secondary:hover {
		border-color: rgba(255, 255, 255, 0.15);
		color: #d1d5db;
	}

	@keyframes badge-pop {
		from { opacity: 0; transform: scale(0.5); }
		to { opacity: 1; transform: scale(1); }
	}

	@keyframes crown-bounce {
		from { opacity: 0; transform: translateY(-10px) scale(0.5); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}

	@media (max-width: 500px) {
		.stats-row { gap: 1rem; padding: 0.75rem 1rem; }
		.podium { gap: 1.5rem; }
	}
</style>
