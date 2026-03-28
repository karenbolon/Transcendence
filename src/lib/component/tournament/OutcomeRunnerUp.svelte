<script lang="ts">
	import { ordinal, formatDuration } from '$lib/utils/format_date';
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
		tournamentWins?: number;
		tournamentLosses?: number;
		xpEarned?: number;
		newBadges?: { emoji: string; name: string }[];
		onViewBracket: () => void;
		onBackToLobby: () => void;
	};

	let {
		myScore, opponentScore, opponentUsername, opponentDisplayName = null, opponentAvatarUrl,
		myUsername, myDisplayName = null, myAvatarUrl,
		tournamentName,
		tournamentWins = 0, tournamentLosses = 1,
		xpEarned = 0,
		newBadges = [],
		onViewBracket, onBackToLobby,
	}: Props = $props();
</script>

<div class="result-icon">🥈</div>
<div class="result-label runner-up">RUNNER-UP</div>
<h1 class="result-text">So close!</h1>
<p class="result-sub">{tournamentName} — Final</p>

<div class="vs-layout">
	<div class="player-card">
		<div class="avatar-wrap">
			<!-- TODO -->
			<!-- pass name to all avatar components -->
			<UserAvatar avatarUrl={myAvatarUrl} username={myUsername} displayName={myDisplayName} size="xl" />
		</div>
		<span class="player-name">{myUsername}</span>
		<span class="player-score loser">{myScore}</span>
	</div>
	<div class="vs-divider">
		<div class="vs-line"></div>
		<span class="vs-text">VS</span>
		<div class="vs-line"></div>
	</div>
	<div class="player-card">
		<span class="crown-small">👑</span>
		<div class="avatar-wrap champion-ring">
			<UserAvatar avatarUrl={opponentAvatarUrl} username={opponentUsername} displayName={opponentDisplayName} size="xl" />
		</div>
		<span class="player-name">{opponentUsername}</span>
		<span class="player-score winner">{opponentScore}</span>
		<span class="player-tag champion-tag">CHAMPION</span>
	</div>
</div>

<div class="place-card silver">
	<strong>2nd Place — Silver</strong>
	<span>An incredible tournament run</span>
</div>

<div class="run-card">
	<span class="run-title">Your tournament run</span>
	<div class="run-stats">
		<div class="stat">
			<span class="stat-value">2nd</span>
			<span class="stat-label">PLACE</span>
		</div>
		<div class="stat">
			<span class="stat-value wins">{tournamentWins}</span>
			<span class="stat-label">WINS</span>
		</div>
		<div class="stat">
			<span class="stat-value losses">{tournamentLosses}</span>
			<span class="stat-label">LOSS</span>
		</div>
		<div class="stat">
			<span class="stat-value xp">+{xpEarned}</span>
			<span class="stat-label">XP</span>
		</div>
	</div>
</div>

{#if newBadges.length > 0}
	<div class="badges">
		{#each newBadges as badge, i}
			<div class="badge" style="animation-delay: {0.8 + i * 0.1}s">
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

	.result-label {
		font-size: 1.55rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		margin-bottom: 0.25rem;
	}

	.result-label.runner-up { color: #9ca3af; }

	.result-text {
		font-size: 1.6rem;
		font-weight: 800;
		color: #f3f4f6;
		margin: 0 0 0.25rem 0;
	}

	.result-sub {
		font-size: 0.85rem;
		color: #6b7280;
		margin: 0 0 1.5rem 0;
	}

	.vs-layout {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4.5rem;
		margin-bottom: 1.5rem;
		width: 100%;
	}

	.player-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		position: relative;
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

	.player-name {
		font-size: 0.95rem;
		font-weight: 600;
		color: #d1d5db;
	}

	.player-score {
		font-size: 2.5rem;
		font-weight: 800;
		line-height: 1;
	}

	.player-score.winner { color: #4ade80; }
	.player-score.loser { color: #f87171; opacity: 0.6; }

	.player-tag {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
	}

	.champion-tag {
		background: rgba(251, 191, 36, 0.12);
		color: #fbbf24;
	}

	.vs-divider {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		color: #4b5563;
	}

	.vs-text {
		font-size: 0.95rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.vs-line {
		width: 2px;
		height: 24px;
		background: rgba(255, 255, 255, 0.06);
	}

	.crown-small {
		font-size: 1.25rem;
		position: absolute;
		top: -12px;
		z-index: 1;
	}

	.place-card {
		width: 110%;
		max-width: 660px;
		padding: 0.85rem 1.25rem;
		border-radius: 0.75rem;
		text-align: center;
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.place-card.silver {
		background: rgba(148, 163, 184, 0.06);
		border: 1px solid rgba(148, 163, 184, 0.15);
	}

	.place-card strong {
		font-size: 0.95rem;
		color: #e2e8f0;
	}

	.place-card span {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.run-card {
		width: 110%;
		max-width: 660px;
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.025);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		margin-bottom: 1rem;
		text-align: center;
	}

	.run-title {
		display: block;
		font-size: 0.98rem;
		font-weight: 600;
		color: #d1d5db;
		margin-bottom: 0.75rem;
	}

	.run-stats {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
	}

	.stat { text-align: center; }

	.stat-value {
		display: block;
		font-size: 1.25rem;
		font-weight: 700;
		color: #d1d5db;
	}

	.stat-value.xp { color: #4ade80; }
	.stat-value.wins { color: #4ade80; }
	.stat-value.losses { color: #f87171; }

	.stat-label {
		display: block;
		font-size: 0.65rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-top: 0.1rem;
	}

	.badges {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.4rem;
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

	@media (max-width: 500px) {
		.vs-layout { gap: 1rem; }
		.player-score { font-size: 1.8rem; }
		.run-stats { gap: 1rem; }
	}
</style>
