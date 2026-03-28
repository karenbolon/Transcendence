<script lang="ts">
	import { formatDate } from '$lib/utils/format_date';
	import type { ActivityItem } from '$lib/types/dashboard';

	let {
		items,
		userId,
	}: {
		items: ActivityItem[];
		userId: number;
	} = $props();
</script>

<div class="feed-card">
	<div class="feed-header">
		<h2 class="feed-title">Recent Activity</h2>
	</div>
	{#if items.length === 0}
		<div class="empty-mini">No recent activity</div>
	{:else}
		<div class="feed-list">
			{#each items as item}
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
								<strong
									>{item.userId === userId
										? 'You'
										: item.displayName || item.username}</strong
								>
								unlocked
								<span class="badge-highlight"
									>{item.achievementIcon} {item.achievementName}</span
								>
							</div>
							<div class="feed-time">{formatDate(item.unlockedAt)}</div>
						</div>
						<span class="feed-emoji achievement-tier-{item.achievementTier}"
							>{item.achievementIcon}</span
						>
					{:else}
						<div class="feed-avatar">
							{#if item.winnerAvatarUrl}
								<img
									src={item.winnerAvatarUrl}
									alt=""
									class="feed-avatar-img"
								/>
							{:else}
								🏆
							{/if}
						</div>
						<div class="feed-content">
							<div class="feed-text">
								<strong
									>{item.winnerId === userId
										? 'You'
										: item.winnerDisplayName || item.winnerName}</strong
								>
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

<style>
	.feed-card {
		background: linear-gradient(
			135deg,
			rgba(22, 22, 58, 0.8),
			rgba(16, 16, 42, 0.9)
		);
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
		top: 0;
		left: 0;
		right: 0;
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

	.feed-list {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.feed-item {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.55rem 0.65rem;
		border-radius: 0.5rem;
		transition: background 0.15s;
	}

	.feed-item:hover {
		background: rgba(255, 255, 255, 0.03);
	}

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

	.feed-avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 50%;
	}

	.feed-content {
		flex: 1;
		min-width: 0;
	}
	.feed-text {
		font-size: 0.88rem;
		color: #d1d5db;
		line-height: 1.4;
	}
	.feed-text strong {
		color: #fff;
		font-weight: 600;
	}
	.feed-time {
		font-size: 0.75rem;
		color: #5a5a7e;
		margin-top: 0.1rem;
	}
	.feed-emoji {
		font-size: 1.2rem;
		flex-shrink: 0;
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
</style>
