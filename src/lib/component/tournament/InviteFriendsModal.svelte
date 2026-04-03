<script lang="ts">
	import UserAvatar from '$lib/component/common/UserAvatar.svelte';

	type Props = {
		friends: Array<{
			id: number;
			username: string;
			name: string | null;
			avatar_url: string | null;
			is_online: boolean;
		}>;
		alreadyInvited: number[];
		participantIds: number[];
		onInvite: (friendId: number) => void;
		onClose: () => void;
	};

	let { friends, alreadyInvited, participantIds, onInvite, onClose }: Props =
		$props();

	let search = $state('');

	let filtered = $derived(
		friends.filter((f) => {
			const q = search.toLowerCase();
			return (
				f.username.toLowerCase().includes(q) ||
				(f.name?.toLowerCase().includes(q) ?? false)
			);
		}),
	);

	function getStatus(friendId: number): 'invited' | 'joined' | 'available' {
		if (participantIds.includes(friendId)) return 'joined';
		if (alreadyInvited.includes(friendId)) return 'invited';
		return 'available';
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" onclick={onClose}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		<button class="close-btn" onclick={onClose}>&times;</button>
		<h3 class="modal-title">Invite Friends</h3>

		<input
			type="text"
			class="search-input"
			bind:value={search}
			placeholder="Search friends..."
		/>

		<div class="friend-list">
			{#each filtered as friend}
				{@const status = getStatus(friend.id)}
				<div class="friend-row">
					<UserAvatar
						username={friend.username}
						avatarUrl={friend.avatar_url}
						size="sm"
					/>
					<div class="friend-info">
						<span class="friend-name">{friend.name ?? friend.username}</span>
						<span class="friend-status" class:online={friend.is_online}>
							{friend.is_online ? 'Online' : 'Offline'}
						</span>
					</div>
					{#if status === 'joined'}
						<span class="badge joined-badge">Joined</span>
					{:else if status === 'invited'}
						<span class="badge invited-badge">Invited</span>
					{:else}
						<button class="invite-btn" onclick={() => onInvite(friend.id)}
							>Invite</button
						>
					{/if}
				</div>
			{/each}
			{#if filtered.length === 0}
				<p class="empty">No friends found</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.modal {
		background: #161628;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1rem;
		padding: 1.5rem;
		width: 100%;
		max-width: 400px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: none;
		border: none;
		color: #6b7280;
		font-size: 1.2rem;
		cursor: pointer;
	}

	.modal-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: #f3f4f6;
		margin: 0 0 1rem;
	}

	.search-input {
		width: 100%;
		padding: 0.6rem 0.8rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
		color: #f3f4f6;
		font-size: 0.85rem;
		outline: none;
		margin-bottom: 0.75rem;
		box-sizing: border-box;
	}
	.search-input:focus {
		border-color: rgba(255, 107, 157, 0.4);
	}

	.friend-list {
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.friend-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 0.6rem;
		border-radius: 0.5rem;
		transition: background 0.15s;
	}
	.friend-row:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.friend-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.friend-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: #d1d5db;
	}

	.friend-status {
		font-size: 0.7rem;
		color: #6b7280;
	}
	.friend-status.online {
		color: #4ade80;
	}

	.badge {
		font-size: 0.65rem;
		font-weight: 600;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
	}
	.joined-badge {
		background: rgba(74, 222, 128, 0.12);
		color: #4ade80;
	}
	.invited-badge {
		background: rgba(251, 191, 36, 0.12);
		color: #fbbf24;
	}

	.invite-btn {
		padding: 0.3rem 0.8rem;
		background: transparent;
		border: 1px solid rgba(255, 107, 157, 0.3);
		color: #ff6b9d;
		border-radius: 0.4rem;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.15s;
	}
	.invite-btn:hover {
		background: rgba(255, 107, 157, 0.1);
	}

	.empty {
		text-align: center;
		color: #4b5563;
		font-size: 0.8rem;
		padding: 1rem;
	}
</style>
