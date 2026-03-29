<script lang="ts">
	import OutcomeAdvancing from './OutcomeAdvancing.svelte';
	import OutcomeEliminated from './OutcomeEliminated.svelte';
	import OutcomeChampion from './OutcomeChampion.svelte';
	import OutcomeRunnerUp from './OutcomeRunnerUp.svelte';

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
</script>

<div class="result-page">
	{#if outcome === 'advancing'}
		<OutcomeAdvancing
			{myScore} {opponentScore} {opponentUsername} {opponentDisplayName} {opponentAvatarUrl}
			{myUsername} {myDisplayName} {myAvatarUrl} {durationSeconds} {speedPreset}
			{tournamentName} {round} {totalRounds} {roundName}
			{nextRoundName} {nextOpponent} {xpEarned}
			{onViewBracket} {onContinue}
		/>
	{:else if outcome === 'eliminated'}
		<OutcomeEliminated
			{myScore} {opponentScore} {opponentUsername} {opponentDisplayName} {opponentAvatarUrl}
			{myUsername} {myDisplayName} {myAvatarUrl} {durationSeconds} {speedPreset}
			{tournamentName} {round} {totalRounds} {roundName}
			{placement} {tournamentWins} {tournamentLosses} {tournamentContinues}
			{xpEarned} {newBadges}
			{onViewBracket} {onBackToLobby} {onWatchFinal}
		/>
	{:else if outcome === 'champion'}
		<OutcomeChampion
			{myScore} {opponentScore} {opponentUsername} {opponentDisplayName} {opponentAvatarUrl}
			{myUsername} {myDisplayName} {myAvatarUrl} {durationSeconds} {speedPreset}
			{tournamentName} {round} {totalRounds} {roundName}
			{podium} {championWins} {championTotalTime} {championXpEarned}
			{newBadges}
			{onViewBracket} {onBackToLobby}
		/>
	{:else}
		<OutcomeRunnerUp
			{myScore} {opponentScore} {opponentUsername} {opponentDisplayName} {opponentAvatarUrl}
			{myUsername} {myDisplayName} {myAvatarUrl} {durationSeconds} {speedPreset}
			{tournamentName} {round} {totalRounds} {roundName}
			{podium} {tournamentWins} {tournamentLosses}
			{xpEarned} {newBadges}
			{onViewBracket} {onBackToLobby}
		/>
	{/if}
</div>

<style>
	.result-page {
		max-width: 700px;
		margin: 0 auto;
		padding: 5rem 1.5rem 4rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		animation: page-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes page-in {
		from { opacity: 0; transform: translateY(20px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
