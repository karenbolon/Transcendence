<script lang="ts">
	import UserAvatar from '$lib/component/UserAvatar.svelte';

	type Action = {
		label: string;
		icon: string;
		variant: string;
		onclick: () => void;
	};

	type Props = {
		id: number;
		username: string;
		displayName: string | null;
		avatarUrl: string | null;
		actions: Action[];
		loading?: string;
	};

	let {
		id,
		username,
		displayName,
		avatarUrl,
		actions,
		loading = '',
	}: Props = $props();
</script>

<div class="friend-card">
	<a href="/friends/{id}" class="friend-info">
		<UserAvatar {username} {displayName} {avatarUrl} size="md" />
		<div class="friend-details">
			<span class="friend-name">{displayName || username}</span>
			<span class="friend-handle">@{username}</span>
		</div>
	</a>
	<div class="friend-actions">
		{#each actions as action}
			<button
				class="btn-action btn-{action.variant}"
				disabled={loading === action.variant}
				onclick={action.onclick}
			>
				{action.icon}
				{loading === action.variant ? '...' : action.label}
			</button>
		{/each}
	</div>
</div>

<style>
	.friend-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		border: 1px solid transparent;
		transition: all 0.15s;
	}
	.friend-card:hover {
		background: rgba(255, 255, 255, 0.03);
		border-color: var(--color-border, rgba(255, 255, 255, 0.06));
	}
	.friend-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		flex: 1;
		min-width: 0;
	}
	.friend-details {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}
	.friend-name {
		font-size: 0.95rem;
		font-weight: 600;
		color: #fff;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.friend-handle {
		font-size: 0.78rem;
		color: var(--color-text-dim, #6b7280);
	}
	.friend-actions {
		display: flex;
		gap: 0.4rem;
		flex-shrink: 0;
	}
	.btn-action {
		padding: 0.65rem 0.9rem;
		border-radius: 0.5rem;
		border: 1px solid transparent;
		font-size: 0.88rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}
	.btn-action:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn-challenge {
		background: rgba(255, 107, 157, 0.1);
		color: var(--color-primary, #ff6b9d);
		border-color: rgba(255, 107, 157, 0.15);
	}
	.btn-challenge:hover:not(:disabled) {
		background: rgba(255, 107, 157, 0.2);
	}
	.btn-message {
		background: rgba(96, 165, 250, 0.1);
		color: var(--color-info, #60a5fa);
		border-color: rgba(96, 165, 250, 0.15);
	}
	.btn-message:hover:not(:disabled) {
		background: rgba(96, 165, 250, 0.2);
	}
	.btn-accept {
		background: rgba(74, 222, 128, 0.1);
		color: var(--color-success, #4ade80);
		border-color: rgba(74, 222, 128, 0.15);
	}
	.btn-accept:hover:not(:disabled) {
		background: rgba(74, 222, 128, 0.2);
	}
	.btn-decline {
		background: rgba(248, 113, 113, 0.08);
		color: var(--color-error, #f87171);
		border-color: rgba(248, 113, 113, 0.12);
	}
	.btn-decline:hover:not(:disabled) {
		background: rgba(248, 113, 113, 0.15);
	}
	.btn-block {
		background: transparent;
		color: var(--color-text-dim, #6b7280);
		border-color: rgba(255, 255, 255, 0.06);
	}
	.btn-block:hover:not(:disabled) {
		color: var(--color-error, #f87171);
		border-color: rgba(248, 113, 113, 0.2);
	}
	.btn-remove {
		background: transparent;
		color: var(--color-text-dim, #6b7280);
		border-color: rgba(255, 255, 255, 0.06);
	}
	.btn-remove:hover:not(:disabled) {
		color: var(--color-error, #f87171);
		border-color: rgba(248, 113, 113, 0.2);
	}
	.btn-cancel {
		background: rgba(255, 255, 255, 0.05);
		color: var(--color-text-muted, #9ca3af);
		border-color: rgba(255, 255, 255, 0.08);
	}
	.btn-cancel:hover:not(:disabled) {
		color: var(--color-error, #f87171);
	}
	.btn-unblock {
		background: rgba(74, 222, 128, 0.08);
		color: var(--color-success, #4ade80);
		border-color: rgba(74, 222, 128, 0.12);
	}
	.btn-unblock:hover:not(:disabled) {
		background: rgba(74, 222, 128, 0.15);
	}
	.btn-add {
		background: rgba(255, 107, 157, 0.1);
		color: var(--color-primary, #ff6b9d);
		border-color: rgba(255, 107, 157, 0.15);
	}
	.btn-add:hover:not(:disabled) {
		background: rgba(255, 107, 157, 0.2);
	}

	@media (max-width: 640px) {
		.friend-card {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
		.friend-actions {
			width: 100%;
		}
		.btn-action {
			flex: 1;
			text-align: center;
		}
	}
</style>
