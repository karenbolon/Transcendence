<script lang="ts">
	import UserAvatar from '$lib/component/UserAvatar.svelte';
	import { formatDate } from '$lib/utils/format_date';
	import { speedEmoji } from '$lib/utils/format_game';
	import { _ } from 'svelte-i18n';

	type H2hMatch = {
		id: number;
		won: boolean;
		yourScore: number;
		theirScore: number;
		speedPreset: string;
		playedAt: Date | string;
	};

	type Props = {
		open: boolean;
		you: { username: string; name: string; avatarUrl: string | null };
		them: { username: string; name: string; avatarUrl: string | null };
		yourWins: number;
		theirWins: number;
		total: number;
		avgScore: string;
		bestWin: string;
		lastPlayed: Date | string | null;
		recentMatches: H2hMatch[];
		onclose: () => void;
	};

	let {
		open,
		you,
		them,
		yourWins,
		theirWins,
		total,
		avgScore,
		bestWin,
		lastPlayed,
		recentMatches,
		onclose,
	}: Props = $props();

	let yourWinPct = $derived(total > 0 ? Math.round((yourWins / total) * 100) : 50);
	let theirWinPct = $derived(total > 0 ? 100 - yourWinPct : 50);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={onclose}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal" onclick={(e) => e.stopPropagation()}>

			<!-- Header -->
			<div class="modal-header">
					<h2 class="modal-title">{$_('common.headToHead')}</h2>
					<span class="games-badge">{total} {$_('common.games')}{total !== 1 ? 's' : ''}</span>
			</div>

			<!-- Avatars + Score -->
			<div class="versus">
					<div class="player you-side">
						<div class="player-avatar">
							<UserAvatar username={you.username} displayName={you.name} avatarUrl={you.avatarUrl} size="xl" />
						</div>
						<span class="player-name">{$_('dashboard.you')}</span>
					</div>

					<div class="score-center">
						<span class="win-count you-wins">{yourWins}</span>
						<div class="h2h-divider">
							<div class="h2h-dash"></div>
							<span class="h2h-vs">vs</span>
							<div class="h2h-dash"></div>
						</div>
						<span class="win-count them-wins">{theirWins}</span>
					</div>

					<div class="player them-side">
						<div class="player-avatar">
							<UserAvatar username={them.username} displayName={them.name} avatarUrl={them.avatarUrl} size="xl" />
						</div>
						<span class="player-name">{them.name}</span>
					</div>
			</div>

			<!-- Win percentage bar -->
			<div class="win-bar-section">
				<div class="h2h-bar-header">
					<span class="win-pct">{yourWinPct}% {$_('common.wins')}</span>
					<span class="win-pct">{theirWinPct}% {$_('common.wins')}</span>
				</div>
				<div class="win-bar">
					<div class="you-fill" style="width: {yourWinPct}%"></div>
					<div class="them-fill" style="width: {theirWinPct}%"></div>
				</div>
			</div>

			<!-- Stats row -->
			<div class="stats-row">
				<div class="stat">
					<span class="stat-value">{total}</span>
					<span class="stat-label">{$_('dashboard.levelUpModal.total')}</span>
				</div>
				<div class="stat">
					<span class="stat-value">{avgScore}</span>
					<span class="stat-label">{$_('common.avgScore')}</span>
				</div>
				<div class="stat">
					<span class="stat-value">{bestWin}</span>
					<span class="stat-label">{$_('common.bestWin')}</span>
				</div>
				<div class="stat">
					<span class="stat-value">{lastPlayed ? formatDate(lastPlayed) : '—'}</span>
					<span class="stat-label">{$_('common.bestWin')}</span>
				</div>
			</div>

			<!-- Recent matches -->
			{#if recentMatches.length > 0}
				<div class="recent-section">
					<span class="recent-title">{$_('common.recent')}</span>
					<div class="recent-list">
						{#each recentMatches as match (match.id)}
							<div class="recent-row" class:won={match.won} class:lost={!match.won}>
								<span class="recent-result">{match.won ? 'W' : 'L'}</span>
								<span class="recent-score">
									{match.yourScore}-{match.theirScore}
								</span>
								<span class="recent-speed">{speedEmoji(match.speedPreset)}</span>
								<span class="recent-time">{formatDate(match.playedAt)}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Actions -->
			<div class="modal-actions">
				<button class="action-btn challenge-btn">🎮 {$_('common.challenge')}</button>
				<button class="action-btn view-btn" onclick={onclose}>{$_('common.close')}</button>
			</div>

		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(10, 10, 26, 0.75);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fade-in 0.15s ease-out;
	}

	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

	.modal {
		width: 100%;
		max-width: 620px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(145deg, #181840, #12122e);
		border: 1px solid rgba(255, 107, 157, 0.12);
		border-radius: 1.1rem;
		padding: 1.5rem;
		overflow-y: auto;
		box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 107, 157, 0.05);
		animation: modal-in 0.25s ease-out;
	}

	@keyframes modal-in {
		from { opacity: 0; transform: scale(0.95) translateY(10px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}

	/* Header */
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.25rem;
	}

	.modal-title {
		font-size: 1.15rem;
		font-weight: 900;
		color: #d1d5db;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.modal-title::before {
		content: '';
		width: 3px;
		height: 16px;
		border-radius: 2px;
		background: #ff6b9d;
	}

	.games-badge {
		font-size: 0.7rem;
		color: #7a7a9e;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		padding: 0.2rem 0.6rem;
		font-weight: 500;
	}

	/* Versus section */
	.versus {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 3.5rem;
		padding: 1.25rem 1.5rem;
	}

	.player {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		min-width: 80px;
	}

	.player-avatar {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		border: 3px solid rgba(255, 255, 255, 0.08);
	}

	.you-side .player-avatar {
		border-color: rgba(74, 222, 128, 0.3);
	}

	.them-side .player-avatar {
		border-color: rgba(168, 85, 247, 0.3);
	}

	.player-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: #d1d5db;
		margin-top: 0.25rem;
	}

	.score-center {
		display: flex;
		align-items: center;
		gap: 1.75rem;
	}

	.win-count {
		font-size: 2.5rem;
		font-weight: 800;
		line-height: 1;
	}

	.you-wins { color: #ff6b9d; }
	.them-wins { color: #a855f7; }

	/* vs */
	.h2h-divider {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
	}

	.h2h-vs {
		font-size: 0.85rem;
		color: #3b3b5e;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.h2h-dash {
		width: 20px;
		height: 2px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 1px;
	}

	/* Win bar */
	.win-bar-section {
		padding: 0 1.5rem 1rem;
		/* display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.25rem; */
	}
	.h2h-bar-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.3rem;
	}

	.win-pct {
		font-size: 0.62rem;
		font-weight: 600;
		white-space: nowrap;
		color: #7a7a9e;
	}

	.win-bar {
		flex: 1;
		width: 100%;
		height: 8px;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.05);
		overflow: hidden;
		display: flex;
	}

	.you-fill {
		height: 100%;
		background: linear-gradient(90deg, #ff6b9d, #e84393);
		border-radius: 4px 0 0 4px;
		transition: width 0.8s;
	}

	.them-fill {
		height: 100%;
		background: linear-gradient(90deg, #7c3aed, #a855f7);
		border-radius: 0 4px 4px 0;
		transition: width 0.8s;
	}

	/* Stats row */
	.stats-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.stat {
		padding: 0.85rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		border-right: 1px solid rgba(255, 255, 255, 0.04);
	}

	.stat:last-child {
		border-right: none;
	}

	.stat-value {
		font-size: 1rem;
		font-weight: 700;
		color: #fff;
	}

	.stat-label {
		font-size: 0.6rem;
		color: #7a7a9e;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	/* Recent matches */
	.recent-section {
		padding: 0 1.5rem 1.25rem;
	}

	.recent-title {
		font-size: 0.78rem;
		font-weight: 600;
		color: #9ca3af;
		margin-bottom: 0.5rem;
	}

	/* .recent-list {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	} */

	.recent-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 0.65rem;
		border-radius: 0.45rem;
		background: rgba(255, 255, 255, 0.02);
		margin-bottom: 0.3rem;
		font-size: 0.78rem;
		transition: background 0.15s;
	}

	/* /* .recent-row:nth-child(odd) { background: rgba(255, 255, 255, 0.03); } */
	.recent-row.won .recent-result  {
		background: rgba(74, 222, 128, 0.12);
		color: #4ade80;
	 }
	.recent-row.lost .recent-result {
		background: rgba(248, 113, 113, 0.1);
		color: #f87171;
	}

	.recent-result {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6rem;
		font-weight: 700;
	}

	/* .recent-row.won .recent-result  { background: rgba(74, 222, 128, 0.12); color: #4ade80; }
	.recent-row.lost .recent-result { background: rgba(248, 113, 113, 0.1); color: #f87171; } */

	.recent-score {
		font-weight: 600;
		color: #d1d5db;
		min-width: 40px;
	}

	.recent-speed { font-size: 0.78rem; }

	.recent-time {
		color: #4b5563;
		font-size: 0.68rem;
		margin-left: auto;
	}

	/* Actions (commented out for now) */
	.modal-actions {
		padding: 0 1.5rem 1.25rem;
		display: flex;
		gap: 0.75rem;
	}

	.action-btn {
		flex: 1;
		padding: 0.5rem;
		border-radius: 0.5rem;
		border: none;
		font-family: inherit;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		transition: all 0.2s;
		text-decoration: none;
	}

	.challenge-btn {
		background: linear-gradient(135deg, #ff6b9d, #e84393);
		color: #fff;
		box-shadow: 0 4px 16px rgba(255, 107, 157, 0.25);
	}

	.challenge-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 20px rgba(255, 107, 157, 0.35);
	}

	.view-btn {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: #d1d5db;
	}

	.view-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
	}


	/* Responsive */
	@media (max-width: 640px) {
		.stats-row {
			grid-template-columns: repeat(2, 1fr);
		}

		.win-count {
			font-size: 1.75rem;
		}
		.versus {
			gap: 0.75rem;
		}

		.player-avatar {
			width: 56px;
			height: 56px;
		}
	}
</style>