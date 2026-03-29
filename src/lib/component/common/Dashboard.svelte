<script lang="ts">
	import type { DashboardProps } from '$lib/types/dashboard';
	import DashboardLeaderboard from '$lib/component/dashboard/DashboardLeaderboard.svelte';
	import DashboardActivity from '$lib/component/dashboard/DashboardActivity.svelte';
	import DashboardTournaments from '$lib/component/dashboard/DashboardTournaments.svelte';
	import DashboardQuickPlay from '$lib/component/dashboard/DashboardQuickPlay.svelte';

	let {
		user,
		globalLeaderboard,
		friendsLeaderboard,
		activityFeed,
		openTournaments,
	}: DashboardProps = $props();
</script>

<div class="dashboard">
	<!-- Welcome -->
	<div class="welcome-row">
		<div>
			<h1 class="welcome-title">
				{user.totalGames > 0 ? 'Welcome back,' : 'Welcome,'}
				<span class="accent"> {user.displayName || user.username} 👋</span>
			</h1>
			<p class="welcome-sub">
				{user.totalGames > 0
					? 'Ready for another match?'
					: 'Ready for your first match?'}
			</p>
		</div>
		<a href="/play" class="btn-play">🎮 Play now</a>
	</div>

	<!-- LEADERBOARDS -->
	<div class="two-col">
		<DashboardLeaderboard
			title="Global Leaderboard"
			players={globalLeaderboard}
			viewAllHref="/leaderboard"
			variant="global"
		/>
		<DashboardLeaderboard
			title="Friends"
			players={friendsLeaderboard}
			viewAllHref="/leaderboard?tab=friends"
			variant="friends"
		/>
	</div>

	<!-- ACTIVITY FEED -->
	<DashboardActivity items={activityFeed} userId={user.id} />

	<!-- TOURNAMENTS -->
	<DashboardTournaments tournaments={openTournaments} />

	<!-- QUICK PLAY -->
	<DashboardQuickPlay />
</div>

<style>
	.dashboard {
		width: 100%;
		max-width: 1300px;
		margin: 0 auto;
		padding: 2.5rem 1.5rem 4rem;
		display: flex;
		flex-direction: column;
		gap: 1.9rem;
	}

	/* WELCOME */
	.welcome-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1.6rem;
		padding: 1rem;
	}
	.welcome-title {
		font-size: 2rem;
	}

	.accent {
		color: var(--accent, #ff6b9d);
	}

	.welcome-sub {
		color: #7a7a9e;
		font-size: 0.9rem;
		margin-top: 0.15rem;
	}

	.btn-play {
		padding: 0.6rem 1.5rem;
		border-radius: 0.6rem;
		border: none;
		background: linear-gradient(135deg, var(--accent, #ff6b9d), #e84393);
		color: #fff;
		font-family: inherit;
		font-size: 1.05rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		box-shadow: 0 2px 16px rgba(255, 107, 157, 0.25);
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.btn-play:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 24px rgba(255, 107, 157, 0.35);
	}

	/* TWO-COLUMN */
	.two-col {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
	}

	/* RESPONSIVE */
	@media (max-width: 768px) {
		.dashboard {
			padding: 1rem 1rem 3rem;
		}
		.welcome-row {
			flex-direction: column;
			align-items: flex-start;
		}
		.two-col {
			grid-template-columns: 1fr;
		}
	}
</style>
