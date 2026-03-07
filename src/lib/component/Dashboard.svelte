<script lang="ts">
	import { formatDate } from '$lib/utils/format_date';
	import { formatTournamentTime, formatTournamentFormat } from '$lib/utils/format_game';
	import type { DashboardProps } from '$lib/types/dashboard';
	import {RANK_MEDALS } from '$lib/utils/format_progression';

	let { user, globalLeaderboard, friendsLeaderboard, activityFeed, openTournaments }: DashboardProps = $props();

</script>

<div class="dashboard">
	<!-- Welcome -->
	<div class="welcome-row">
		<div>
			<h1 class="welcome-title">
				Welcome back, <span class="accent">{user.displayName || user.username} 👋</span>
			</h1>
			<p class="welcome-sub">Ready for another match?</p>
		</div>
		<a href="/play" class="btn-play">🎮 Play Now</a>
	</div>

	<!-- LEADERBOARDS -->
	<div class="two-col">
		<!-- Global -->
		<div class="lb-card global">
			<div class="lb-header">
				<h2 class="lb-title">Global Leaderboard</h2>
				<a href="/leaderboard" class="lb-link">View all →</a>
			</div>
			<div class="podium">
				{#each globalLeaderboard as player, i}
					<a href="/friends/[id]/{player.id}" class="podium-row rank-{i + 1}">
						<span class="rank-medal">
							{RANK_MEDALS[i]}
						</span>
						<div class="podium-avatar rank-{i + 1}">
							{#if player.avatarUrl}
								<img src={player.avatarUrl} alt="" class="podium-avatar-img" />
							{:else}
								{(player.displayName || player.username).charAt(0).toUpperCase()}
							{/if}
						</div>
						<div class="podium-info">
							<div class="podium-name">{player.displayName || player.username}</div>
							<div class="podium-stat">
								{player.totalGames} games · {player.winRate}% win rate
							</div>
						</div>
						<span class="podium-wins rank-{i + 1}">{player.wins} W</span>
					</a>
				{:else}
					<div class="empty-mini">No games played yet</div>
				{/each}
			</div>
		</div>

		<!-- Friends -->
		<div class="lb-card friends">
			<div class="lb-header">
				<h2 class="lb-title">Friends Leaderboard</h2>
				<a href="/leaderboard?tab=friends" class="lb-link">View all →</a>
			</div>
			<div class="podium">
				{#each friendsLeaderboard as player, i}
					<a href="/friends/[id]/{player.id}" class="podium-row rank-{i + 1}">
						<span class="rank-medal">
							{RANK_MEDALS[i]}
						</span>
						<div class="podium-avatar rank-{i + 1}">
							{#if player.avatarUrl}
								<img src={player.avatarUrl} alt="" class="podium-avatar-img" />
							{:else}
								{(player.displayName || player.username).charAt(0).toUpperCase()}
							{/if}
						</div>
						<div class="podium-info">
							<div class="podium-name">{player.displayName || player.username}</div>
							<div class="podium-stat">
								{player.totalGames} games · {player.winRate}% win rate
							</div>
						</div>
						<span class="podium-wins rank-{i + 1}">{player.wins} W</span>
					</a>
				{:else}
					<div class="empty-mini">Add friends to see their rankings!</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- ═══ ACTIVITY FEED ═══ -->
	<div class="feed-card">
		<div class="feed-header">
			<h2 class="feed-title">Recent Activity</h2>
		</div>
		{#if activityFeed.length === 0}
			<div class="empty-mini">Play some games to see activity here!</div>
		{:else}
			<div class="feed-list">
				{#each activityFeed as item}
					<div class="feed-item">
						{#if item.type === 'achievement'}
							<div class="feed-avatar">
								{#if item.avatarUrl}
									<img src={item.avatarUrl} alt="" class="feed-avatar-img" />
								{:else}
									{item.achievementIcon}
								{/if}
							</div>
							<div class="feed-content">
								<div class="feed-text">
									<strong>{item.userId === user.id ? 'You' : (item.displayName || item.username)}</strong>
									unlocked <span class="badge-highlight">{item.achievementIcon} {item.achievementName}</span>
								</div>
								<div class="feed-time">{formatDate(item.unlockedAt)}</div>
							</div>
							<span class="feed-emoji achievement-tier-{item.achievementTier}">{item.achievementIcon}</span>
						{:else}
							<div class="feed-avatar">
								{#if item.winnerAvatarUrl}
									<img src={item.winnerAvatarUrl} alt="" class="feed-avatar-img" />
								{:else}
									🏆
								{/if}
							</div>
							<div class="feed-content">
								<div class="feed-text">
									<strong>{item.winnerId === user.id ? 'You' : (item.winnerDisplayName || item.winnerName)}</strong>
									beat <strong>{item.loserName}</strong>
									{item.winnerScore}–{item.loserScore}
								</div>
								<div class="feed-time">{formatDate(item.playedAt)}</div>
							</div>
							<span class="feed-emoji">🏆</span>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- OPEN TOURNAMENTS -->
	<div class="tournaments-section">
		<div class="tourn-header">
			<h2 class="tourn-title">Open Tournaments</h2>
			<a href="/tournaments" class="tourn-link">Browse all</a>
		</div>
		{#if openTournaments.length === 0}
			<div class="empty-mini">No open tournaments right now. Check back soon!</div>
		{:else}
			<div class="tourn-grid">
				{#each openTournaments as tourn}
					<div class="tourn-card">
						<span class="tourn-status {tourn.status}">
							{tourn.status === 'open' ? 'Open' : 'Scheduled'}
						</span>
						<div class="tourn-card-name">{tourn.name}</div>
						<div class="tourn-card-meta">
							<div class="tourn-meta-row">
								<span class="icon">👥</span>
								{tourn.playerCount} / {tourn.maxPlayers} players
							</div>
							<div class="tourn-meta-row">
								<span class="icon">📅</span>
								{formatTournamentTime(tourn.startsAt)}
							</div>
							<div class="tourn-meta-row">
								<span class="icon">🏆</span>
								{formatTournamentFormat(tourn.format)}
							</div>
						</div>
						{#if tourn.playerCount < tourn.maxPlayers}
							<a href="/tournaments/{tourn.id}/join" class="tourn-join">Join Tournament</a>
						{:else}
							<button class="tourn-join" disabled>Full</button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- QUICK PLAY -->
	<div class="quick-section">
		<div class="quick-header">
			<h2 class="quick-title">Quick Play</h2>
		</div>
		<div class="quick-grid">
			<a href="/play?mode=remote" class="quick-card">
				<span class="quick-icon">🌐</span>
				<span class="quick-name">Find a Match</span>
				<span class="quick-desc">Play against someone online</span>
			</a>
			<a href="/play?mode=local" class="quick-card">
				<span class="quick-icon">👥</span>
				<span class="quick-name">Local 1v1</span>
				<span class="quick-desc">Same keyboard, two players</span>
			</a>
			<a href="/play?mode=computer" class="quick-card">
				<span class="quick-icon">🤖</span>
				<span class="quick-name">vs Computer</span>
				<span class="quick-desc">Practice against the AI</span>
			</a>
		</div>
	</div>

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
		font-weight: 700;
		color: #fff;
		margin: 0;
	}

	.accent { color: var(--accent, #ff6b9d); }

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

	/* LEADERBOARD CARDS */
	.lb-card {
		background: linear-gradient(135deg, rgba(22, 22, 58, 0.8), rgba(16, 16, 42, 0.9));
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 1rem;
		padding: 1.25rem;
		position: relative;
		overflow: hidden;
	}

	.lb-card::before {
		content: '';
		position: absolute;
		top: 0; left: 0; right: 0;
		height: 2px;
		opacity: 0.5;
	}

	.lb-card.global::before { background: linear-gradient(90deg, transparent, #ffd700, transparent); }
	.lb-card.friends::before { background: linear-gradient(90deg, transparent, var(--accent, #ff6b9d), transparent); }

	.lb-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.lb-title {
		font-size: 1.05rem;
		font-weight: 600;
		color: #d1d5db;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
	}

	.lb-title::before {
		content: '';
		width: 3px;
		height: 14px;
		border-radius: 2px;
	}

	.lb-card.global .lb-title::before { background: #ffd700; }
	.lb-card.friends .lb-title::before { background: var(--accent, #ff6b9d); }

	.lb-link {
		font-size: 0.7rem;
		color: #7a7a9e;
		text-decoration: none;
		transition: color 0.15s;
	}

	.lb-link:hover { color: var(--accent, #ff6b9d); }

	/* Podium */
	.podium { display: flex; flex-direction: column; gap: 0.5rem; }

	.podium-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.75rem;
		border-radius: 0.6rem;
		transition: all 0.2s;
		text-decoration: none;
		border: 1px solid transparent;
	}

	.podium-row:hover { background: rgba(255, 255, 255, 0.04); }

	.podium-row.rank-1 { background: rgba(255, 215, 0, 0.04); border-color: rgba(255, 215, 0, 0.08); }
	.podium-row.rank-2 { background: rgba(192, 192, 210, 0.03); border-color: rgba(192, 192, 210, 0.06); }
	.podium-row.rank-3 { background: rgba(205, 127, 50, 0.03); border-color: rgba(205, 127, 50, 0.06); }

	.rank-medal { font-size: 1.7rem; width: 24px; text-align: center; flex-shrink: 0; }

	.podium-avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.82rem;
		font-weight: 700;
		flex-shrink: 0;
		color: #fff;
		overflow: hidden;
	}

	.podium-avatar.rank-1 { background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.08)); border: 2px solid rgba(255, 215, 0, 0.25); }
	.podium-avatar.rank-2 { background: linear-gradient(135deg, rgba(192, 192, 210, 0.15), rgba(192, 192, 210, 0.06)); border: 2px solid rgba(192, 192, 210, 0.2); }
	.podium-avatar.rank-3 { background: linear-gradient(135deg, rgba(205, 127, 50, 0.15), rgba(205, 127, 50, 0.06)); border: 2px solid rgba(205, 127, 50, 0.2); }

	.podium-avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

	.podium-info { flex: 1; min-width: 0; }
	.podium-name { font-size: 0.92rem; font-weight: 600; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.podium-stat { font-size: 0.68rem; color: #7a7a9e; }

	.podium-wins {
		font-size: 0.75rem;
		font-weight: 700;
		flex-shrink: 0;
		padding: 0.15rem 0.5rem;
		border-radius: 1rem;
	}

	.podium-wins.rank-1 { color: #ffd700; background: rgba(255, 215, 0, 0.1); }
	.podium-wins.rank-2 { color: #c0c0d2; background: rgba(192, 192, 210, 0.08); }
	.podium-wins.rank-3 { color: #cd7f32; background: rgba(205, 127, 50, 0.08); }

	/* ACTIVITY FEED */
	.feed-card {
		background: linear-gradient(135deg, rgba(22, 22, 58, 0.8), rgba(16, 16, 42, 0.9));
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 1rem;
		padding: 1.25rem;
		position: relative;
		overflow: hidden;
	}

	.feed-card::before {
		content: '';
		position: absolute;
		top: 0; left: 0; right: 0;
		height: 2px;
		opacity: 0.5;
		background: linear-gradient(90deg, transparent, #a855f7, transparent);
	}

	.feed-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.feed-title {
		font-size: 1.05rem;
		font-weight: 600;
		color: #d1d5db;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
	}

	.feed-title::before {
		content: '';
		width: 3px;
		height: 14px;
		border-radius: 2px;
		background: #a855f7;
	}

	.feed-list { display: flex; flex-direction: column; gap: 0.45rem; }

	.feed-item {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.55rem 0.65rem;
		border-radius: 0.5rem;
		transition: background 0.15s;
	}

	.feed-item:hover { background: rgba(255, 255, 255, 0.03); }

	.feed-avatar {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		flex-shrink: 0;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}

	.feed-avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

	.feed-content { flex: 1; min-width: 0; }
	.feed-text { font-size: 0.88rem; color: #d1d5db; line-height: 1.4; }
	.feed-text strong { color: #fff; font-weight: 600; }
	.feed-time { font-size: 0.75rem; color: #5a5a7e; margin-top: 0.1rem; }
	.feed-emoji { font-size: 1.2rem; flex-shrink: 0; }

	/* TOURNAMENTS */
	.tournaments-section {
		background: linear-gradient(135deg, rgba(22, 22, 58, 0.7), rgba(16, 16, 42, 0.8));
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 1rem;
		padding: 1.25rem;
		position: relative;
		overflow: hidden;
	}

	.tournaments-section::before {
		content: '';
		position: absolute;
		top: 0; left: 0; right: 0;
		height: 2px;
		opacity: 0.5;
		background: linear-gradient(90deg, transparent, #60a5fa, transparent);
	}

	.tourn-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.tourn-title {
		font-size: 1.05rem;
		font-weight: 600;
		color: #d1d5db;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
	}

	.tourn-title::before {
		content: '';
		width: 3px;
		height: 14px;
		border-radius: 2px;
		background: #60a5fa;
	}

	.tourn-link {
		font-size: 0.7rem;
		color: #7a7a9e;
		text-decoration: none;
		transition: color 0.15s;
	}

	.tourn-link:hover { color: #60a5fa; }

	.tourn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }

	.tourn-card {
		padding: 1rem;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		transition: all 0.2s;
		position: relative;
	}

	.tourn-card:hover {
		border-color: rgba(96, 165, 250, 0.25);
		transform: translateY(-2px);
	}

	.tourn-card-name { font-size: 0.82rem; font-weight: 600; color: #fff; margin-bottom: 0.35rem; }

	.tourn-card-meta { display: flex; flex-direction: column; gap: 0.2rem; }

	.tourn-meta-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.7rem;
		color: #7a7a9e;
	}

	.tourn-meta-row .icon { font-size: 0.8rem; }

	.tourn-status {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		font-size: 0.58rem;
		padding: 0.15rem 0.5rem;
		border-radius: 1rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.tourn-status.open {
		background: rgba(74, 222, 128, 0.1);
		color: #4ade80;
		border: 1px solid rgba(74, 222, 128, 0.15);
	}

	.tourn-status.scheduled {
		background: rgba(251, 191, 36, 0.1);
		color: #fbbf24;
		border: 1px solid rgba(251, 191, 36, 0.15);
	}

	.tourn-join {
		display: block;
		margin-top: 0.6rem;
		width: 100%;
		padding: 0.35rem;
		border-radius: 0.4rem;
		border: none;
		background: rgba(96, 165, 250, 0.1);
		color: #60a5fa;
		font-family: inherit;
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
		text-decoration: none;
		text-align: center;
	}

	.tourn-join:hover { background: rgba(96, 165, 250, 0.2); }
	.tourn-join:disabled { opacity: 0.4; cursor: not-allowed; }

	/* QUICK PLAY */
	.quick-header { margin-bottom: 0.75rem; }

	.quick-title {
		font-size: 1.05rem;
		font-weight: 600;
		color: #d1d5db;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
	}

	.quick-title::before {
		content: '';
		width: 3px;
		height: 14px;
		border-radius: 2px;
		background: #4ade80;
	}

	.quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }

	.quick-card {
		background: linear-gradient(135deg, rgba(22, 22, 58, 0.8), rgba(16, 16, 42, 0.9));
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.85rem;
		padding: 1.25rem;
		text-align: center;
		text-decoration: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.25s;
		position: relative;
		overflow: hidden;
	}

	.quick-card::before {
		content: '';
		position: absolute;
		top: 0; left: 0; right: 0;
		height: 2px;
		opacity: 0;
		transition: opacity 0.25s;
	}

	.quick-card:hover {
		border-color: rgba(255, 107, 157, 0.2);
		transform: translateY(-3px);
	}

	.quick-card:hover::before { opacity: 0.5; }

	.quick-card:nth-child(1)::before { background: linear-gradient(90deg, transparent, #a855f7, transparent); }
	.quick-card:nth-child(2)::before { background: linear-gradient(90deg, transparent, #4ade80, transparent); }
	.quick-card:nth-child(3)::before { background: linear-gradient(90deg, transparent, #60a5fa, transparent); }

	.quick-icon { font-size: 1.75rem; }
	.quick-name { color: #d1d5db; font-size: 0.92rem; font-weight: 600; }
	.quick-desc { color: #7a7a9e; font-size: 0.68rem; line-height: 1.4; }

	/* SHARED */
	.empty-mini {
		text-align: center;
		padding: 1.5rem;
		color: #5a5a7e;
		font-size: 0.78rem;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 0.5rem;
		border: 1px dashed rgba(255, 255, 255, 0.06);
	}

	/* RESPONSIVE */
	@media (max-width: 768px) {
		.dashboard { padding: 1rem 1rem 3rem; }
		.welcome-row { flex-direction: column; align-items: flex-start; }
		.two-col { grid-template-columns: 1fr; }
		.tourn-grid { grid-template-columns: 1fr; }
		.quick-grid { grid-template-columns: 1fr; }
	}
</style>
