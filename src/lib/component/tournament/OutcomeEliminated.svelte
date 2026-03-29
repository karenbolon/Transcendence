<script lang="ts">
	import { ordinal, formatDuration } from '$lib/utils/format_date';
	import { speedEmoji } from '$lib/utils/format_game';
	import UserAvatar from '$lib/component/common/UserAvatar.svelte';

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
		placement?: number;
		tournamentWins?: number;
		tournamentLosses?: number;
		tournamentContinues?: { player1Username: string; player2Username: string; roundName: string } | null;
		xpEarned?: number;
		newBadges?: { emoji: string; name: string }[];
		onViewBracket: () => void;
		onBackToLobby: () => void;
		onWatchFinal?: () => void;
	};

	let {
		myScore, opponentScore, opponentUsername, opponentDisplayName = null, opponentAvatarUrl,
		myUsername, myDisplayName = null, myAvatarUrl,
		tournamentName, roundName,
		placement, tournamentWins = 0, tournamentLosses = 1,
		tournamentContinues,
		xpEarned = 0,
		newBadges = [],
		onViewBracket, onBackToLobby, onWatchFinal,
	}: Props = $props();
</script>

<div class="result-icon">😤</div>
<div class="result-label eliminated">ELIMINATED</div>
<h1 class="result-text">{roundName}</h1>
<p class="result-sub">{tournamentName}</p>

<div class="vs-layout">
	<div class="player-card">
		<div class="avatar-wrap">
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
		<div class="avatar-wrap winner-ring">
			<UserAvatar avatarUrl={opponentAvatarUrl} username={opponentUsername} displayName={opponentDisplayName} size="xl" />
		</div>
		<span class="player-name">{opponentUsername}</span>
		<span class="player-score winner">{opponentScore}</span>
		<span class="player-tag winner-tag">WINNER</span>
	</div>
</div>

<div class="run-card">
	<span class="run-title">Your tournament run</span>
	<div class="run-stats">
		<div class="stat">
			<span class="stat-value">{placement ? ordinal(placement) : '-'}</span>
			<span class="stat-label">PLACEMENT</span>
		</div>
		<div class="stat">
			<span class="stat-value wins">{tournamentWins}</span>
			<span class="stat-label">WINS</span>
		</div>
		<div class="stat">
			<span class="stat-value losses">{tournamentLosses}</span>
			<span class="stat-label">LOSSES</span>
		</div>
		<div class="stat">
			<span class="stat-value xp">+{xpEarned}</span>
			<span class="stat-label">XP</span>
		</div>
	</div>
</div>

{#if tournamentContinues}
	<div class="continues-card">
		<span class="continues-label">Tournament continues...</span>
		<div class="continues-matchup">
			<UserAvatar username={tournamentContinues.player1Username} size="sm" />
			<span class="continues-vs">vs</span>
			<UserAvatar username={tournamentContinues.player2Username} size="sm" />
		</div>
		<div class="continues-names">
			<span>{tournamentContinues.player1Username}</span>
			<span>{tournamentContinues.player2Username}</span>
		</div>
		<span class="continues-meta">{tournamentContinues.roundName} starting soon</span>
	</div>
{/if}

<div class="actions">
	{#if onWatchFinal}
		<button class="btn btn-primary" onclick={onWatchFinal}>
			Watch final
		</button>
	{/if}
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

	.result-label.eliminated { color: #f87171; }

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

	.vs-divider {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		color: #4b5563;
	}

	.vs-text {
		font-size: 0.85rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.vs-line {
		width: 2px;
		height: 24px;
		background: rgba(255, 255, 255, 0.06);
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

	.avatar-wrap.winner-ring {
		border-color: #4ade80;
		box-shadow: 0 0 20px rgba(74, 222, 128, 0.2);
	}

	.player-name {
		font-size: 0.95rem;
		font-weight: 700;
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

	.winner-tag {
		background: rgba(74, 222, 128, 0.12);
		color: #4ade80;
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
		font-size: 1rem;
		font-weight: 600;
		color: #d1d5db;
		margin-bottom: 0.75rem;
	}

	.run-stats {
		display: flex;
		justify-content: center;
		gap: 2.5rem;
	}

	.continues-card {
		width: 110%;
		max-width: 660px;
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.025);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		margin-bottom: 1.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.continues-label {
		font-size: 0.85rem;
		color: #6b7280;
	}

	.continues-matchup {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.continues-vs {
		font-size: 0.65rem;
		color: #4b5563;
		font-weight: 600;
	}

	.continues-names {
		display: flex;
		gap: 2rem;
		font-size: 0.75rem;
		color: #d1d5db;
		font-weight: 500;
	}

	.continues-meta {
		font-size: 0.65rem;
		color: #6b7280;
	}

	.stat { text-align: center; }

	.stat-value {
		display: block;
		font-size: 1.55rem;
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

	.actions {
		display: flex;
		gap: 0.7rem;
		width: 110%;
		max-width: 660px;
	}

	.btn {
		flex: 1;
		padding: 0.9rem;
		border-radius: 0.6rem;
		font-size: 0.98rem;
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

	@media (max-width: 500px) {
		.vs-layout { gap: 1rem; }
		.player-score { font-size: 1.8rem; }
		.run-stats { gap: 1rem; }
	}
</style>
