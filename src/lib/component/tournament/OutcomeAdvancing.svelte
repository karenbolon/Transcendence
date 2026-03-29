<script lang="ts">
	import { speedEmoji } from '$lib/utils/format_game';
	import { capitalize } from '$lib/utils/format_progression';
	import { formatDuration } from '$lib/utils/format_date';
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
		nextRoundName?: string;
		nextOpponent?: { username: string; wins: number; seed: number } | null;
		xpEarned?: number;
		onViewBracket: () => void;
		onContinue?: () => void;
	};

	let {
		myScore, opponentScore, opponentUsername, opponentDisplayName = null, opponentAvatarUrl,
		myUsername, myDisplayName = null, myAvatarUrl, durationSeconds, speedPreset,
		round, totalRounds, roundName,
		nextRoundName, nextOpponent, xpEarned = 0,
		onViewBracket, onContinue,
	}: Props = $props();

	function getRoundLabel(r: number, total: number): string {
		const fromFinal = total - r;
		if (fromFinal === 0) return 'Final';
		if (fromFinal === 1) return 'SF';
		if (fromFinal === 2) return 'QF';
		return `R${r}`;
	}

	let roundProgress = $derived(
		Array.from({ length: totalRounds }, (_, i) => ({
			round: i + 1,
			label: getRoundLabel(i + 1, totalRounds),
			status: i + 1 < round + 1 ? 'completed' as const
				: i + 1 === round + 1 ? 'next' as const
				: 'upcoming' as const,
		}))
	);
</script>

<div class="result-icon">⬆️</div>
<div class="result-label advancing">ROUND COMPLETE</div>
<h1 class="result-text">You're advancing!</h1>
<p class="result-sub">{roundName} → <strong>{nextRoundName || 'Next Round'}</strong></p>

<div class="vs-layout">
	<div class="player-card">
		<div class="avatar-wrap winner-ring">
			<UserAvatar avatarUrl={myAvatarUrl} username={myUsername} displayName={myDisplayName} size="xl" />
		</div>
		<span class="player-name">{myUsername}</span>
		<span class="player-score winner">{myScore}</span>
		<span class="player-tag winner-tag">WINNER</span>
	</div>
	<div class="vs-divider">
		<div class="vs-line"></div>
		<span class="vs-text">VS</span>
		<div class="vs-line"></div>
	</div>
	<div class="player-card">
		<div class="avatar-wrap">
			<UserAvatar avatarUrl={opponentAvatarUrl} username={opponentUsername} displayName={opponentDisplayName} size="xl" />
		</div>
		<span class="player-name">{opponentUsername}</span>
		<span class="player-score loser">{opponentScore}</span>
	</div>
</div>

<div class="progress-card">
	<span class="progress-title">Tournament progress</span>
	<div class="progress-bar-wrap">
		<div class="progress-bar-fill" style="width: {((round) / totalRounds) * 100}%"></div>
	</div>
	<span class="progress-fraction">{round}/{totalRounds}</span>
	<div class="round-indicators">
		{#each roundProgress as rp}
			<div class="round-dot" class:completed={rp.status === 'completed'} class:next={rp.status === 'next'}>
				{#if rp.status === 'completed'}
					<span class="dot-icon">✓</span>
				{:else if rp.status === 'next'}
					<span class="dot-icon">→</span>
				{:else}
					<span class="dot-icon empty"></span>
				{/if}
				<span class="dot-label">{rp.label}</span>
			</div>
		{/each}
	</div>
</div>

{#if nextOpponent}
	<div class="next-opponent-card">
		<span class="next-label">Next opponent</span>
		<div class="next-info">
			<UserAvatar username={nextOpponent.username} size="md" />
			<div class="next-details">
				<strong>{nextOpponent.username}</strong>
				<span class="next-meta">{nextOpponent.wins} wins · Seed #{nextOpponent.seed}</span>
			</div>
		</div>
	</div>
{/if}

<div class="stats-row">
	<div class="stat">
		<span class="stat-value">{formatDuration(durationSeconds)}</span>
		<span class="stat-label">DURATION</span>
	</div>
	<div class="stat">
		<span class="stat-value">{speedEmoji(speedPreset)} {capitalize(speedPreset)}</span>
		<span class="stat-label">SPEED</span>
	</div>
	<div class="stat">
		<span class="stat-value xp">+{xpEarned}</span>
		<span class="stat-label">XP</span>
	</div>
</div>

<div class="actions">
	<button class="btn btn-primary" onclick={onContinue}>
		Continue to {nextRoundName || 'Next Round'}
	</button>
	<button class="btn btn-secondary" onclick={onViewBracket}>
		Bracket
	</button>
</div>

<style>
	.result-icon {
		font-size: 3.5rem;
		margin-bottom: 0.5rem;
	}

	.result-label {
		font-size: 1.55rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		margin-bottom: 0.25rem;
	}

	.result-label.advancing { color: #4ade80; }

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

	.result-sub strong {
		color: #4ade80;
	}

	.vs-layout {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		margin-bottom: 1.5rem;
		width: 100%;
	}

	.vs-divider {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		color: #4b5563;
	}

	.vs-text {
		font-size: 0.85rem;
		font-weight: 700;
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

	.winner-tag {
		background: rgba(74, 222, 128, 0.12);
		color: #4ade80;
	}

	.vs-text {
		font-size: 0.8rem;
		font-weight: 700;
		color: #4b5563;
		letter-spacing: 0.1em;
	}

	.progress-card {
		width: 110%;
		max-width: 660px;
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.025);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
	}

	.progress-title {
		font-size: 0.8rem;
		font-weight: 600;
		color: #d1d5db;
	}

	.progress-bar-wrap {
		width: 100%;
		height: 6px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 3px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #ff6b9d, #ff85b1);
		border-radius: 3px;
		transition: width 0.6s ease;
	}

	.progress-fraction {
		font-size: 0.7rem;
		color: #6b7280;
		align-self: flex-end;
		margin-top: -0.3rem;
	}

	.round-indicators {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
	}

	.round-dot {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.dot-icon {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.65rem;
		font-weight: 700;
		background: rgba(255, 255, 255, 0.06);
		color: #6b7280;
	}

	.round-dot.completed .dot-icon {
		background: rgba(74, 222, 128, 0.15);
		color: #4ade80;
	}

	.round-dot.next .dot-icon {
		background: rgba(251, 191, 36, 0.15);
		color: #fbbf24;
	}

	.dot-icon.empty {
		color: transparent;
	}

	.dot-label {
		font-size: 0.6rem;
		color: #6b7280;
		font-weight: 500;
	}

	.next-opponent-card {
		width: 110%;
		max-width: 660px;
		padding: 0.85rem 1.25rem;
		background: rgba(251, 191, 36, 0.04);
		border: 1px solid rgba(251, 191, 36, 0.15);
		border-radius: 0.75rem;
		margin-bottom: 1rem;
	}

	.next-label {
		display: block;
		font-size: 0.7rem;
		font-weight: 600;
		color: #fbbf24;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.next-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.next-details {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.next-details strong {
		font-size: 0.9rem;
		color: #f3f4f6;
	}

	.next-meta {
		font-size: 0.7rem;
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
		font-size: 1.55rem;
		font-weight: 700;
		color: #d1d5db;
	}

	.stat-value.xp { color: #4ade80; }

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

	@media (max-width: 500px) {
		.vs-layout { gap: 1rem; }
		.player-score { font-size: 1.8rem; }
		.stats-row { gap: 1rem; padding: 0.75rem 1rem; }
	}
</style>
