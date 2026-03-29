<script lang="ts">
	import { formatTournamentFormat } from '$lib/utils/format_game';
	import type { Tournament } from '$lib/types/dashboard';

	let {
		tournaments,
	}: {
		tournaments: Tournament[];
	} = $props();
</script>

<div class="tournaments-section">
	<div class="tourn-header">
		<h2 class="tourn-title">Tournaments</h2>
		<a href="/tournaments" class="tourn-link">View all</a>
	</div>
	{#if tournaments.length === 0}
		<div class="empty-mini">No tournaments yet</div>
	{:else}
		<div class="tourn-grid">
			{#each tournaments as tourn}
				<a
					href="/tournaments/{tourn.id}"
					class="tourn-card tourn-card-{tourn.status}"
				>
					<span class="tourn-status {tourn.status}">
						{tourn.status === 'scheduled'
							? 'Open'
							: tourn.status === 'in_progress'
								? 'Live'
								: 'Finished'}
					</span>
					<div class="tourn-card-name">{tourn.name}</div>
					<div class="tourn-card-meta">
						<div class="tourn-meta-row">
							<span class="icon">👥</span>
							{tourn.playerCount} / {tourn.maxPlayers} players
						</div>
						<div class="tourn-meta-row">
							<span class="icon">🏆</span>
							{formatTournamentFormat(tourn.format)}
						</div>
					</div>
					{#if tourn.status === 'scheduled' && tourn.playerCount < tourn.maxPlayers}
						<span class="tourn-action join">Join</span>
					{:else if tourn.status === 'in_progress'}
						<span class="tourn-action live">Watch</span>
					{:else if tourn.status === 'finished'}
						<span class="tourn-action finished">Results</span>
					{:else}
						<span class="tourn-action full">Full</span>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tournaments-section {
		background: linear-gradient(
			135deg,
			rgba(22, 22, 58, 0.7),
			rgba(16, 16, 42, 0.8)
		);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 1rem;
		padding: 1.25rem;
		position: relative;
		overflow: hidden;
	}

	.tournaments-section::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
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

	.tourn-link:hover {
		color: #60a5fa;
	}

	.tourn-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
	}

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

	.tourn-card-name {
		font-size: 0.82rem;
		font-weight: 600;
		color: #fff;
		margin-bottom: 0.35rem;
	}

	.tourn-card-meta {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.tourn-meta-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.7rem;
		color: #7a7a9e;
	}

	.tourn-meta-row .icon {
		font-size: 0.8rem;
	}

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
		background: rgba(74, 222, 128, 0.1);
		color: #4ade80;
		border: 1px solid rgba(74, 222, 128, 0.15);
	}

	.tourn-status.in_progress {
		background: rgba(251, 191, 36, 0.1);
		color: #fbbf24;
		border: 1px solid rgba(251, 191, 36, 0.15);
	}

	.tourn-status.finished {
		background: rgba(255, 255, 255, 0.06);
		color: #888;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.tourn-card-in_progress {
		border-color: rgba(251, 191, 36, 0.2);
	}

	.tourn-action {
		display: block;
		margin-top: 0.6rem;
		width: 100%;
		padding: 0.35rem;
		border-radius: 0.4rem;
		border: none;
		font-family: inherit;
		font-size: 0.72rem;
		font-weight: 600;
		text-decoration: none;
		text-align: center;
	}

	.tourn-action.join {
		background: rgba(74, 222, 128, 0.1);
		color: #4ade80;
	}
	.tourn-action.live {
		background: rgba(251, 191, 36, 0.1);
		color: #fbbf24;
	}
	.tourn-action.finished {
		background: rgba(255, 255, 255, 0.04);
		color: #888;
	}
	.tourn-action.full {
		background: rgba(255, 255, 255, 0.04);
		color: #555;
	}

	.empty-mini {
		text-align: center;
		padding: 1.5rem;
		color: #5a5a7e;
		font-size: 0.78rem;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 0.5rem;
		border: 1px dashed rgba(255, 255, 255, 0.06);
	}

	@media (max-width: 768px) {
		.tourn-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
