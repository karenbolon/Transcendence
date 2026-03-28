<script lang="ts">
	import { speedEmoji } from '$lib/utils/format_game';
	import { capitalize } from '$lib/utils/format_progression';
	import { formatDuration } from '$lib/utils/format_date';
	import UserAvatar from '../UserAvatar.svelte';

	type TournamentOutcome = 'advancing' | 'eliminated' | 'champion' | 'runner-up';

	type Props = {
		outcome: TournamentOutcome;
		// Match result
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
		// Tournament context
		tournamentName: string;
		round: number;
		totalRounds: number;
		roundName: string;
		// Advancing
		nextRoundName?: string;
		nextOpponent?: { username: string; wins: number; seed: number } | null;
		xpEarned?: number;
		// Eliminated
		placement?: number;
		tournamentWins?: number;
		tournamentLosses?: number;
		tournamentContinues?: { player1Username: string; player2Username: string; roundName: string } | null;
		// Champion / Runner-up
		podium?: { username: string; displayName?: string | null; avatarUrl: string | null; placement: number }[];
		championWins?: number;
		championTotalTime?: number;
		championXpEarned?: number;
		// Badges
		newBadges?: { emoji: string; name: string }[];
		// Actions
		onViewBracket: () => void;
		onBackToLobby: () => void;
		onWatchFinal?: () => void;
		onContinue?: () => void;
	};

	let {
		outcome,
		myScore, opponentScore, opponentUsername, opponentDisplayName = null, opponentAvatarUrl,
		myUsername, myDisplayName = null, myAvatarUrl, durationSeconds, speedPreset,
		tournamentName, round, totalRounds, roundName,
		nextRoundName, nextOpponent, xpEarned = 0,
		placement, tournamentWins = 0, tournamentLosses = 1,
		tournamentContinues,
		podium = [], championWins = 0, championTotalTime = 0, championXpEarned = 0,
		newBadges = [],
		onViewBracket, onBackToLobby, onWatchFinal, onContinue,
	}: Props = $props();

	// Build round progress indicators for advancing view
	let roundProgress = $derived(
		Array.from({ length: totalRounds }, (_, i) => ({
			round: i + 1,
			label: getRoundLabel(i + 1, totalRounds),
			status: i + 1 < round + 1 ? 'completed' as const
				: i + 1 === round + 1 ? 'next' as const
				: 'upcoming' as const,
		}))
	);

	function getRoundLabel(r: number, total: number): string {
		const fromFinal = total - r;
		if (fromFinal === 0) return 'Final';
		if (fromFinal === 1) return 'SF';
		if (fromFinal === 2) return 'QF';
		return `R${r}`;
	}

	function ordinal(n: number): string {
		const s = ['th', 'st', 'nd', 'rd'];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	}
</script>

<div class="result-page">
	{#if outcome === 'advancing'}
		<!-- ADVANCING VIEW -->
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
			<span class="vs-text">VS</span>
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

	{:else if outcome === 'eliminated'}
		<!-- ELIMINATED VIEW -->
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
			<span class="vs-text">VS</span>
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

	{:else if outcome === 'champion'}
		<!-- CHAMPION VIEW -->
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

	{:else if outcome === 'runner-up'}
		<!-- RUNNER-UP VIEW -->
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
	{/if}
</div>

<style>
	.result-page {
		max-width: 600px;
		margin: 0 auto;
		padding: 3rem 1.5rem 4rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		animation: page-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.result-icon {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.result-icon.trophy {
		font-size: 3rem;
	}

	.result-label {
		font-size: 0.85rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		margin-bottom: 0.25rem;
	}

	.result-label.advancing { color: #4ade80; }
	.result-label.eliminated { color: #f87171; }
	.result-label.champion { color: #fbbf24; }
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

	.player-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: #d1d5db;
	}

	.player-score {
		font-size: 2.2rem;
		font-weight: 800;
		line-height: 1;
	}

	.player-score.winner { color: #4ade80; }
	.player-score.loser { color: #f87171; opacity: 0.6; }

	.player-tag {
		font-size: 0.55rem;
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

	.champion-tag {
		background: rgba(251, 191, 36, 0.12);
		color: #fbbf24;
	}

	.vs-text {
		font-size: 0.8rem;
		font-weight: 700;
		color: #4b5563;
		letter-spacing: 0.1em;
	}

	.progress-card {
		width: 100%;
		max-width: 420px;
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
		width: 100%;
		max-width: 420px;
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

	.run-card {
		width: 100%;
		max-width: 420px;
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.025);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		margin-bottom: 1rem;
		text-align: center;
	}

	.run-title {
		display: block;
		font-size: 0.8rem;
		font-weight: 600;
		color: #d1d5db;
		margin-bottom: 0.75rem;
	}

	.run-stats {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
	}

	.continues-card {
		width: 100%;
		max-width: 420px;
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
		font-size: 0.75rem;
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

	.champion-avatar {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		margin-bottom: 1rem;
		position: relative;
	}

	.crown {
		font-size: 1.5rem;
		margin-bottom: -0.3rem;
		animation: crown-bounce 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
		animation-delay: 0.3s;
	}

	.crown-small {
		font-size: 1rem;
		position: absolute;
		top: -12px;
		z-index: 1;
	}

	/* champion-avatar size is controlled by UserAvatar size="xxl" (110px) */

	.champion-name {
		font-size: 1.1rem;
		font-weight: 700;
		color: #f3f4f6;
	}

	.champion-place {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.podium {
		display: flex;
		justify-content: center;
		gap: 2.5rem;
		margin-bottom: 1.5rem;
	}

	.podium-entry {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	/* podium-entry avatar size is controlled by UserAvatar size="lg" (56px) */

	.podium-name {
		font-size: 0.8rem;
		font-weight: 600;
		color: #d1d5db;
	}

	.podium-place {
		font-size: 0.65rem;
		color: #6b7280;
	}

	.place-card {
		width: 100%;
		max-width: 420px;
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
		font-size: 0.9rem;
		color: #e2e8f0;
	}

	.place-card span {
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
		width: 100%;
		max-width: 420px;
	}

	.stat { text-align: center; }

	.stat-value {
		display: block;
		font-size: 0.95rem;
		font-weight: 700;
		color: #d1d5db;
	}

	.stat-value.xp { color: #4ade80; }
	.stat-value.wins { color: #4ade80; }
	.stat-value.losses { color: #f87171; }

	.stat-label {
		display: block;
		font-size: 0.55rem;
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
		width: 100%;
		max-width: 420px;
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

	@keyframes page-in {
		from { opacity: 0; transform: translateY(20px); }
		to { opacity: 1; transform: translateY(0); }
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
		.vs-layout { gap: 1rem; }
		.player-score { font-size: 1.8rem; }
		.stats-row { gap: 1rem; padding: 0.75rem 1rem; }
		.run-stats { gap: 1rem; }
		.podium { gap: 1.5rem; }
	}
</style>
