<script lang="ts">
	import UserAvatar from '$lib/component/common/UserAvatar.svelte';
	import LevelProgress from '$lib/component/progression/LevelProgress.svelte';
	import XpBar from '$lib/component/progression/XpBar.svelte';
	import { formatJoinDate } from '$lib/utils/format_date';
	import type { Progression, FriendshipStatus } from '$lib/types/progression';
	import { DEFAULT_PROGRESSION } from '$lib/utils/format_progression';

	type Props = {
		username: string;
		displayName?: string | null;
		avatarUrl?: string | null;
		email?: string | null;
		bio?: string | null;
		isOnline?: boolean;
		createdAt: Date | string;
		variant: 'own' | 'friend';
		isFriend?: boolean;
		friendshipStatus?: FriendshipStatus;
		hasIncomingRequest?: boolean;
		hasOutgoingRequest?: boolean;
		blockedByMe?: boolean;
		progression?: Progression | null;
		oneditprofile?: () => void;
		onaddfriend?: () => void;
		onunfriend?: () => void;
		onchallenge?: () => void;
		onmessage?: () => void;
	};

	let {
		username,
		displayName = null,
		avatarUrl = null,
		email = null,
		bio = null,
		isOnline = false,
		createdAt,
		variant,
		isFriend = false,
		friendshipStatus = null,
		hasIncomingRequest = false,
		hasOutgoingRequest = false,
		blockedByMe = false,
		progression = null,
		oneditprofile,
		onaddfriend,
		onunfriend,
		onchallenge,
		onmessage,
	}: Props = $props();

	let prog = $derived(progression ?? DEFAULT_PROGRESSION);
</script>

<div class="banner">
	<div class="hero-banner"><div class="banner-grid"></div></div>
	<div class="banner-content">
		<div class="banner-avatar">
			<UserAvatar
				{username}
				displayName={displayName}
				{avatarUrl}
				size="xxl"
				status={isOnline ? 'online' : 'offline'}
			/>
			<!-- Level pip on avatar -->
			<!-- <div class="level-pip">{level}</div> -->
		</div>

		<div class="banner-info">
			<h1 class="banner-name">{displayName || username}</h1>
			<p class="banner-handle">@{username}</p>

			{#if bio}
				<p class="banner-bio">{bio}</p>
			{/if}

			<p class="banner-member">Member since {formatJoinDate(createdAt)}</p>

			<!-- {#if variant === 'own' && email}
				<p class="banner-email">{email}</p>
			{/if} -->
		</div>

		<div class="banner-actions">
			{#if variant === 'own'}
				<button class="banner-btn banner-btn--primary" onclick={oneditprofile}>
					✏️ Edit Profile
				</button>
				<a href="/settings" class="banner-btn">
					⚙️ Settings
				</a>
			{:else}
				{#if isFriend}
					{#if onmessage}
						<button class="banner-btn banner-btn--primary" onclick={onmessage}>💬 Message</button>
					{/if}
					<button class="banner-btn banner-btn--accent" onclick={onchallenge}>🎮 Challenge</button>
					<button class="banner-btn banner-btn--danger" onclick={onunfriend}>Unfriend</button>
				{:else if hasIncomingRequest}
					<button class="banner-btn banner-btn--primary" onclick={onaddfriend}>👋 Add Friend</button>
				{:else if hasOutgoingRequest || friendshipStatus === 'pending'}
					<button class="banner-btn banner-btn--pending" disabled>⏳ Request Sent</button>
				{:else if blockedByMe}
					<button class="banner-btn banner-btn--pending" disabled>🚫 User Blocked</button>
				{:else}
					<button class="banner-btn banner-btn--primary" onclick={onaddfriend}>👋 Add Friend</button>
				{/if}
			{/if}
		</div>
	</div>

	<div class="banner-xp">
		<div class="xp-row">
			<LevelProgress level={prog.level} size="md" />
			<div class="xp-area">
				<XpBar
					currentXp={prog.currentXp}
					xpToNextLevel={prog.xpToNextLevel}
					level={prog.level}
				/>
			</div>
		</div>
	</div>
</div>

<style>
	.banner {
		background: linear-gradient(135deg, rgba(22, 22, 58, 0.9), rgba(16, 16, 42, 0.95));
		border: 1px solid rgba(255, 107, 157, 0.1);
		border-radius: 1.25rem;
		position: relative;
		overflow: hidden;
	}

	.hero-banner {
		height: 120px;
		background: linear-gradient(135deg,
			rgba(168, 85, 247, 0.15) 0%,
			rgba(255, 107, 157, 0.12) 50%,
			rgba(96, 165, 250, 0.08) 100%);
		position: relative;
		overflow: hidden;
	}

	.banner-grid {
		position: absolute;
		inset: 0;
		background:
			repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.015) 0px, transparent 1px, transparent 40px),
			repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.015) 0px, transparent 1px, transparent 40px);
		animation: grid-drift 8s linear infinite;
	}

	@keyframes grid-drift {
		0% { background-position: 0 0; }
		100% { background-position: 40px 40px; }
	}

	.banner-content {
		display: flex;
		align-items: flex-start;
		gap: 1.25rem;
		padding: 0 1.75rem 1.5rem;
		margin-top: -44px;
		position: relative;
		z-index: 2;
	}

	.banner-avatar {
		flex-shrink: 0;
		border-radius: 50%;
		border: 4px solid var(--bg, #0a0a1a);
		box-shadow: 0 4px 20px rgba(255, 107, 157, 0.15);
		position: relative;
	}

	.banner-info {
		flex: 1;
		min-width: 0;
		padding-top: 3rem;
	}

	.banner-name {
		font-size: 1.5rem;
		font-weight: 700;
		color: #fff;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.banner-handle {
		color: #ff6b9d;
		font-size: 0.9rem;
		font-weight: 500;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.banner-bio {
		color: #9ca3af;
		font-size: 0.85rem;
		margin: 0.5rem 0 0 0;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.banner-member {
		color: #6b7280;
		font-size: 0.8rem;
		margin: 0.4rem 0 0 0;
	}

	.banner-actions {
		flex-shrink: 0;
		padding-top: 3.25rem;
	}

	.banner-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.06);
		color: #d1d5db;
		text-decoration: none;
		white-space: nowrap;
		transition: background 0.15s, border-color 0.15s;
	}

	.banner-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.banner-btn--primary {
		background: rgba(255, 107, 157, 0.12);
		border-color: rgba(255, 107, 157, 0.3);
		color: #ff6b9d;
	}

	.banner-btn--primary:hover {
		background: rgba(255, 107, 157, 0.2);
		border-color: rgba(255, 107, 157, 0.5);
	}

	.banner-btn--accent {
		background: rgba(192, 132, 252, 0.12);
		border-color: rgba(192, 132, 252, 0.3);
		color: #c084fc;
	}

	.banner-btn--accent:hover {
		background: rgba(192, 132, 252, 0.2);
		border-color: rgba(192, 132, 252, 0.5);
	}

	.banner-btn--pending {
		background: rgba(250, 204, 21, 0.1);
		border-color: rgba(250, 204, 21, 0.25);
		color: #facc15;
		cursor: default;
		opacity: 0.8;
	}

	.banner-btn--danger {
		color: #f87171;
		border-color: rgba(248, 113, 113, 0.2);
	}

	.banner-btn--danger:hover {
		background: rgba(248, 113, 113, 0.1);
		border-color: rgba(248, 113, 113, 0.4);
	}

	.banner-xp {
		padding: 1rem 1.75rem 1.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.04);
	}

	.xp-row {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}

	.xp-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	@media (max-width: 640px) {
		.banner {
			padding: 1.25rem;
		}

		.banner-content {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.banner-info {
			align-items: center;
		}

		.banner-actions {
			flex-direction: row;
			align-self: center;
		}
	}
</style>