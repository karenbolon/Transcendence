<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	import UserAvatar from '$lib/component/UserAvatar.svelte';
	import { FRIENDTABS, filterByQuery } from '$lib/utils/format_friends';
	import type { FriendItem, SearchResult } from '$lib/types/friends';
	import { toast } from '$lib/stores/toast.svelte';
	import { getSocket } from '$lib/stores/socket.svelte';

	function challengeUser(friendId: number, username: string) {
		const socket = getSocket();
		if (!socket?.connected) {
			toast.error('Not connected to server');
			return;
		}
		socket.emit('game:invite', { friendId });
		toast.game('Challenge Sent', `Sent to ${username}`);
	}


	let { data } = $props();

	let searchQuery = $state('');
	let searchResults: SearchResult[] = $state([]);
	let searching = $state(false);
	let activeTab = $state('friends');
	let loading = $state('');

	// Derived counts
	let onlineCount = $derived(data.friends.filter((f: FriendItem) => f.is_online).length);

	// Filtered sub-lists for All Friends tab
	let onlineFriends = $derived(filterByQuery(
		data.friends.filter((f: FriendItem) => f.is_online), searchQuery
	));
	let offlineFriends = $derived(filterByQuery(
		data.friends.filter((f: FriendItem) => !f.is_online), searchQuery
	));

	// Filtered list for simple tabs (requests, sent, blocked)
	let currentItems = $derived.by(() => {
		const list =
			activeTab === 'friends' ? data.friends :
			activeTab === 'requests' ? data.requests :
			activeTab === 'sent' ? data.sent :
			activeTab === 'blocked' ? data.blocked :
			[];
		return filterByQuery(list, searchQuery);
	});

	let showSearch = $derived(activeTab === 'find' && searchQuery.trim().length >= 2);

	// Toast helper
	function showToast(message: string, success = true) {
		success ? toast.success(message) : toast.error(message);
	}

	// API search helper (used by input handler and tab switch)
	async function triggerSearch(query: string) {
		searching = true;
		try {
			const res = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`);
			if (res.ok) {
				const json = await res.json();
				searchResults = json.results ?? [];
			}
		} catch {
			searchResults = [];
		} finally {
			searching = false;
		}
	}

	// Debounced search (API — only on Find tab)
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;
	function handleSearchInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		searchQuery = value;
		clearTimeout(searchTimeout);

		if (activeTab === 'find') {
			if (value.trim().length < 2) {
				searchResults = [];
				searching = false;
				return;
			}
			searchTimeout = setTimeout(() => triggerSearch(value.trim()), 300);
		}
	}

	function clearSearch() {
		searchQuery = '';
		searchResults = [];
	}

	// Generic friendship action
	async function friendAction(endpoint: string, friendId: number, successMsg: string) {
		loading = `${endpoint}-${friendId}`;
		try {
			const res = await fetch(`/api/friends/${endpoint}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ friendId }),
			});
			if (res.ok) {
				showToast(successMsg);
				await invalidateAll();
				if (activeTab === 'find' && searchQuery.trim().length >= 2) {
					const searchRes = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`);
					const searchJson = await searchRes.json();
					searchResults = searchJson.results ?? [];
				}
			} else {
				const err = await res.json();
				showToast(err.error || 'Something went wrong', false);
			}
		} catch {
			showToast('Network error', false);
		} finally {
			loading = '';
		}
	}

	// Socket listeners — refresh friends data in real-time
	// Use $effect so it re-runs when the socket becomes available
	// (layout's onMount creates the socket AFTER child components mount)
	const friendEvents = ['friend:request', 'friend:accepted', 'friend:removed', 'friend:online', 'friend:offline'];
	$effect(() => {
		const socket = getSocket();
		if (!socket) return;

		const onRefresh = () => {
			invalidateAll();
			// Re-run search if on Find tab with active query
			if (activeTab === 'find' && searchQuery.trim().length >= 2) {
				triggerSearch(searchQuery.trim());
			}
		};

		friendEvents.forEach(event => socket.on(event, onRefresh));

		return () => {
			friendEvents.forEach(event => socket.off(event, onRefresh));
		};
	});

</script>

<div class="friends-page">
	<!-- Header -->
	<div class="page-header">
		<div class="header-left">
			<h1 class="page-title">Friends</h1>
			<p class="page-stats">{data.counts.friends} friends &middot; {onlineCount} online</p>
		</div>
		<div class="search-wrapper">
			<input
				type="text"
				class="search-input"
				placeholder="Search users..."
				value={searchQuery}
				oninput={handleSearchInput}
			/>
			{#if searchQuery}
				<button class="search-clear" onclick={clearSearch}>&times;</button>
			{:else}
				<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
			{/if}
		</div>
	</div>

	<div class="page-body">
		<!-- Sidebar tabs -->
		<nav class="sidebar">
			{#each FRIENDTABS as tab}
				<button
					class="tab"
					class:active={activeTab === tab.key}
					onclick={() => {
					activeTab = tab.key;
					if (tab.key === 'find' && searchQuery.trim().length >= 2) {
						triggerSearch(searchQuery.trim());
					}
				}}
				>
					<span class="tab-emoji">{tab.emoji}</span>
					<span class="tab-label">{tab.label}</span>
					{#if tab.key !== 'find' && data.counts[tab.key] > 0}
						{#if tab.key === 'friends' && data.counts.friends > 0}
							<span class="content-count">{data.counts.friends}</span>
						{:else}
						<span class="tab-count">{data.counts[tab.key]}</span>
					<!-- {:else if tab.key === 'all' && data.counts.friends > 0}
						<span class="content-count">{data.counts.friends}</span> -->
						{/if}
					{/if}
				</button>
			{/each}
		</nav>

		<!-- Content area -->
		<div class="tab-content">
			<div class="content-header">
				{#if activeTab === 'find'}
					<h2 class="content-title">Find Friends</h2>
				{:else if activeTab === 'friends'}
					<h2 class="content-title">All Friends</h2>
					<span class="content-count">{onlineFriends.length + offlineFriends.length}</span>
				{:else}
					<h2 class="content-title">
						{FRIENDTABS.find(t => t.key === activeTab)?.label ?? 'Friends'}
					</h2>
					<span class="content-count">{currentItems.length}</span>
				{/if}
			</div>

			<!-- ========== FIND TAB ========== -->
			{#if activeTab === 'find'}
				{#if showSearch}
					<p class="search-summary">
						{#if searching}
							Searching...
						{:else}
							{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
						{/if}
					</p>
					{#if !searching && searchResults.length === 0}
						<div class="empty-state">
							<span class="empty-icon">😕</span>
							<p>No players found</p>
							<span class="empty-hint">Try a different name or username.</span>
						</div>
					{:else if !searching}
						<div class="friend-list">
							{#each searchResults as user}
								<div class="friend-card">
									<a href="/friends/{user.id}" class="friend-info">
										<UserAvatar avatarUrl={user.avatar_url} username={user.username} displayName={user.name} size="md" />
										<div class="friend-details">
											<span class="friend-name">{user.name ?? user.username}</span>
											<span class="card-handle">@{user.username.toLowerCase()}</span>
											{#if user.relationship}
												<span class="friend-status-badge {user.relationship}">
													{#if user.relationship === 'accepted'}
														✓ Friends
													{:else if user.relationship === 'pending'}
														⏳ Pending
													{:else if user.relationship === 'blocked'}
														✕ Blocked
													{/if}
												</span>
											{/if}
										</div>
									</a>
									<div class="friend-actions">
										{#if !user.relationship}
											<button
												class="btn btn-add"
												disabled={loading === `request-${user.id}`}
												onclick={() => friendAction('request', user.id, 'Friend request sent')}
											>Add Friend</button>
										{/if}
										<button class="btn btn-challenge" onclick={() => challengeUser(user.id, user.username)}><span class="btn-icon">👾</span> Challenge</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{:else}
					<div class="empty-state">
						<span class="empty-icon">🔍</span>
						<p>Search for users to add as friends</p>
						<span class="empty-hint">Type at least 2 characters to search.</span>
					</div>
				{/if}

			<!-- ========== ALL FRIENDS TAB (with online/offline sections) ========== -->
			{:else if activeTab === 'friends'}
				{#if onlineFriends.length === 0 && offlineFriends.length === 0}
					<div class="empty-state">
						{#if searchQuery.trim()}
							<span class="empty-icon">😕</span>
							<p>No matches for "{searchQuery}"</p>
							<span class="empty-hint">Try a different name or check the Find Friends tab.</span>
						{:else}
							<span class="empty-icon">🔍</span>
							<p>No friends yet. Search for users to add!</p>
						{/if}
					</div>
				{:else}
					{#if onlineFriends.length > 0}
						<div class="section-header">
							<span class="section-dot online"></span>
							<span class="section-label">ONLINE</span>
							<span class="section-count">({onlineFriends.length})</span>
						</div>
						<div class="friend-list">
							{#each onlineFriends as item}
								<div class="friend-card">
									<a href="/friends/{item.id}" class="friend-info">
										<UserAvatar avatarUrl={item.avatar_url} username={item.username} size="md" />
										<div class="friend-details">
											<span class="friend-name">{item.name ?? item.username}</span>
											<span class="card-handle">@{item.username.toLowerCase()}</span>
										</div>
									</a>
									<div class="friend-actions">
										<button class="btn btn-challenge" onclick={() => challengeUser(item.id, item.username)}><span class="btn-icon">👾</span> Challenge</button>
										<button class="btn btn-message"><span class="btn-icon">✉️</span> Message</button>
										<button
											class="btn btn-block"
											disabled={loading === `block-${item.id}`}
											onclick={() => friendAction('block', item.id, 'User blocked')}
										><span class="btn-icon">🚫</span> Block</button>
										<button
											class="btn btn-unfriend"
											disabled={loading === `remove-${item.id}`}
											onclick={() => friendAction('remove', item.id, 'Friend removed')}
										>Unfriend</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}

					{#if offlineFriends.length > 0}
						<div class="section-header">
							<span class="section-dot offline"></span>
							<span class="section-label">OFFLINE</span>
							<span class="section-count">({offlineFriends.length})</span>
						</div>
						<div class="friend-list">
							{#each offlineFriends as item}
								<div class="friend-card">
									<a href="/friends/{item.id}" class="friend-info">
										<UserAvatar avatarUrl={item.avatar_url} username={item.username} size="md" />
										<div class="friend-details">
											<span class="friend-name">{item.name ?? item.username}</span>
											<span class="card-handle">@{item.username.toLowerCase()}</span>
										</div>
									</a>
									<div class="friend-actions">
										<button class="btn btn-message"><span class="btn-icon">✉️</span> Message</button>
										<button
											class="btn btn-block"
											disabled={loading === `block-${item.id}`}
											onclick={() => friendAction('block', item.id, 'User blocked')}
										><span class="btn-icon">🚫</span> Block</button>
										<button
											class="btn btn-unfriend"
											disabled={loading === `remove-${item.id}`}
											onclick={() => friendAction('remove', item.id, 'Friend removed')}
										>Unfriend</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{/if}

			<!-- ========== REQUESTS TAB ========== -->
			{:else if activeTab === 'requests'}
				{#if currentItems.length === 0}
					<div class="empty-state">
						{#if searchQuery.trim()}
							<span class="empty-icon">😕</span>
							<p>No matches for "{searchQuery}"</p>
						{:else}
							<span class="empty-icon">📭</span>
							<p>No pending requests</p>
						{/if}
					</div>
				{:else}
					<div class="friend-list">
						{#each currentItems as item}
							<div class="friend-card">
								<a href="/friends/{item.id}" class="friend-info">
									<UserAvatar avatarUrl={item.avatar_url} username={item.username} size="md" />
									<div class="friend-details">
										<span class="friend-name">{item.name ?? item.username}</span>
										<span class="card-handle">@{item.username.toLowerCase()}</span>
									</div>
								</a>
								<div class="friend-actions">
									<button
										class="btn btn-accept"
										disabled={loading === `accept-${item.id}`}
										onclick={() => friendAction('accept', item.id, 'Friend added!')}
									>Accept</button>
									<button
										class="btn btn-decline"
										disabled={loading === `decline-${item.id}`}
										onclick={() => friendAction('decline', item.id, 'Request declined')}
									>Decline</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}

			<!-- ========== SENT TAB ========== -->
			{:else if activeTab === 'sent'}
				{#if currentItems.length === 0}
					<div class="empty-state">
						{#if searchQuery.trim()}
							<span class="empty-icon">😕</span>
							<p>No matches for "{searchQuery}"</p>
						{:else}
							<span class="empty-icon">✉️</span>
							<p>No sent requests</p>
						{/if}
					</div>
				{:else}
					<div class="friend-list">
						{#each currentItems as item}
							<div class="friend-card">
								<a href="/friends/{item.id}" class="friend-info">
									<UserAvatar avatarUrl={item.avatar_url} username={item.username} size="md" />
									<div class="friend-details">
										<span class="friend-name">{item.name ?? item.username}</span>
										<span class="card-handle">@{item.username.toLowerCase()}</span>
									</div>
								</a>
								<div class="friend-actions">
									<button
										class="btn btn-cancel"
										disabled={loading === `cancel-${item.id}`}
										onclick={() => friendAction('cancel', item.id, 'Request cancelled')}
									>Cancel</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}

			<!-- ========== BLOCKED TAB ========== -->
			{:else if activeTab === 'blocked'}
				{#if currentItems.length === 0}
					<div class="empty-state">
						{#if searchQuery.trim()}
							<span class="empty-icon">😕</span>
							<p>No matches for "{searchQuery}"</p>
						{:else}
							<span class="empty-icon">🚫</span>
							<p>No blocked users</p>
						{/if}
					</div>
				{:else}
					<div class="friend-list">
						{#each currentItems as item}
							<div class="friend-card">
								<a href="/friends/{item.id}" class="friend-info">
									<UserAvatar avatarUrl={item.avatar_url} username={item.username} size="md" />
									<div class="friend-details">
										<span class="friend-name">{item.name ?? item.username}</span>
										<span class="card-handle">@{item.username.toLowerCase()}</span>
									</div>
								</a>
								<div class="friend-actions">
									<button
										class="btn btn-unblock"
										disabled={loading === `unblock-${item.id}`}
										onclick={() => friendAction('unblock', item.id, 'User unblocked')}
									>Unblock</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>


<style>
/* ===== Page container ===== */
	.friends-page {
		max-width: 1350px;
		margin: 0 auto;
		padding: 2rem 2rem 2rem 1rem;
		width: 100%;
	}

/* ===== Page header ===== */
	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.page-title {
		font-size: 1.85rem;
		font-weight: 700;
		color: #fff;
		margin: 0;
	}

	.page-stats {
		font-size: 0.85rem;
		color: #6b7280;
		margin: 0;
	}

/* ===== Page body: sidebar + content ===== */
	.page-body {
		display: flex;
		gap: 2.5rem;
		flex: 1;
		min-height: 0;
	}

/* ===== Search ===== */
	.search-wrapper {
		position: relative;
		width: 350px;
		flex-shrink: 0;
	}

	.search-input {
		width: 100%;
		padding: 0.6rem 2.25rem 0.6rem 0.85rem;
		background-color: var(--card, #16213e);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.6rem;
		color: var(--text, #e5e5e5);
		font-size: 0.85rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.search-input::placeholder { color: #6b7280; }

	.search-input:focus {
		border-color: var(--accent, #ff6b9d);
		box-shadow: 0 0 0 2px rgba(255, 107, 157, 0.15);
	}

	.search-icon {
		position: absolute;
		right: 0.65rem;
		top: 50%;
		transform: translateY(-50%);
		width: 16px;
		height: 16px;
		color: #6b7280;
		pointer-events: none;
	}

	.search-clear {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: #6b7280;
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0.2rem;
		line-height: 1;
	}

	.search-clear:hover { color: #fff; }

/* ===== Sidebar tabs ===== */
	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 190px;
		width: 200px;
		flex-shrink: 0;
		margin-top: 3rem;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 0.95rem;
		padding: 0.7rem 1rem;
		color: #9ca3af;
		font-size: 0.95rem;
		font-weight: 500;
		background: none;
		border: none;
		border-left: 3px solid transparent;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		border-radius: 0 0.5rem 0.5rem 0;
		transition: background-color 0.15s, color 0.15s, border-color 0.15s;
	}

	.tab:hover {
		background-color: rgba(255, 255, 255, 0.04);
		color: #e5e5e5;
	}

	.tab.active {
		border-left-color: var(--accent, #ff6b9d);
		background-color: rgba(255, 107, 157, 0.1);
		color: var(--accent, #ff6b9d);
		font-weight: 600;
	}

	.tab-emoji {
		font-size: 1.35rem;
		flex-shrink: 0;
		line-height: 1;
	}

	.tab-label {
		flex: 1;
		text-align: left;
	}

	.tab-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 20px;
		padding: 0 6px;
		border-radius: 10px;
		background-color: var(--accent, #ff6b9d);
		color: #fff;
		font-size: 0.7rem;
		font-weight: 700;
		line-height: 1;
	}

/* ===== Tab content ===== */
	.tab-content {
		flex: 1;
		padding: 0.25rem 0;
		overflow-y: auto;
		min-width: 0;
	}

/* ===== Content header ===== */
	.content-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 0.75rem;
		margin-bottom: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.content-title {
		font-size: 1.1rem;
		font-weight: 600;
		color: #e5e5e5;
		margin: 0;
	}

	.content-count {
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		background: rgba(255, 255, 255, 0.05);
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
	}

/* ===== Section headers (ONLINE/OFFLINE dividers) ===== */
	.section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 0 0.5rem;
		margin-top: 0.5rem;
	}

	.section-header:first-child {
		margin-top: 0;
		padding-top: 0;
	}

	.section-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.section-dot.online { background-color: #22c55e; }
	.section-dot.offline { background-color: #6b7280; }

	.section-label {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: #9ca3af;
	}

	.section-count {
		font-size: 0.75rem;
		color: #6b7280;
	}

/* ===== Search summary ===== */
	.search-summary {
		font-size: 0.85rem;
		color: #6b7280;
		margin: 0 0 1rem 0;
	}

/* ===== Empty state ===== */
	.empty-state {
		text-align: center;
		padding: 48px 20px;
	}

	.empty-icon {
		font-size: 36px;
		display: block;
		margin-bottom: 12px;
	}

	.empty-state p {
		font-size: 24px;
		margin: 0 0 8px 0;
		color: #8f949d;
	}

	.empty-hint {
		font-size: 16px;
		opacity: 0.6;
		color: #6b7280;
	}

/* ===== Friend list & cards ===== */
	.friend-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.friend-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		gap: 14px;
		background: var(--card, #16213e);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		transition: background-color 0.15s, border-color 0.15s;
	}

	.friend-card:hover {
		background-color: rgba(76, 136, 227, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.friend-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		color: inherit;
		min-width: 0;
		flex: 1;
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
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card-handle {
		font-size: 0.78rem;
		color: #6b7280;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

/* ===== Relationship badge in search results ===== */
	.friend-status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		margin-top: 0.2rem;
		width: fit-content;
	}

	.friend-status-badge.accepted {
		color: #22c55e;
		background: rgba(34, 197, 94, 0.12);
		border: 1px solid rgba(34, 197, 94, 0.25);
	}
	.friend-status-badge.pending {
		color: #eab308;
		background: rgba(234, 179, 8, 0.12);
		border: 1px solid rgba(234, 179, 8, 0.25);
	}
	.friend-status-badge.blocked {
		color: #ef4444;
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid rgba(239, 68, 68, 0.25);
	}

/* ===== Action buttons ===== */
	.friend-actions {
		display: flex;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.45rem 0.9rem;
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
		font-size: 0.92rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: filter 0.15s, transform 0.1s, border-color 0.15s;
	}

	.btn:hover {
		filter: brightness(1.25);
		border-color: rgba(255, 255, 255, 0.15);
	}

	.btn:active {
		transform: scale(0.96);
		filter: brightness(1.1);
	}

	.btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
		filter: none;
	}

	.btn-icon {
		font-size: 0.9rem;
		line-height: 1;
	}

	.btn-add {
		background: var(--accent, #ff6b9d);
		color: #fff;
	}

	.btn-accept {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
		border-color: rgba(34, 197, 94, 0.3);
	}

	.btn-decline {
		background: rgba(239, 68, 68, 0.12);
		color: #ef4444;
		border-color: rgba(239, 68, 68, 0.2);
	}

	.btn-cancel {
		background: rgba(234, 179, 8, 0.12);
		color: #eab308;
		border-color: rgba(234, 179, 8, 0.2);
	}

	.btn-unblock {
		background: rgba(99, 102, 241, 0.12);
		color: #818cf8;
		border-color: rgba(99, 102, 241, 0.2);
	}

	.btn-challenge {
		background: rgba(255, 107, 157, 0.12);
		color: #ff6b9d;
		border-color: rgba(255, 107, 157, 0.2);
	}

	.btn-message {
		background: rgba(102, 166, 255, 0.12);
		color: #66a6ff;
		border-color: rgba(102, 166, 255, 0.2);
	}

	.btn-unfriend {
		background: rgba(156, 163, 175, 0.12);
		color: #9ca3af;
		border-color: rgba(156, 163, 175, 0.2);
	}

	.btn-block {
		background: rgba(239, 68, 68, 0.12);
		color: #ef4444;
		border-color: rgba(239, 68, 68, 0.2);
	}

/* ===== Responsive ===== */
	@media (max-width: 640px) {
		.friends-page { padding: 1rem; }

		.page-header { flex-direction: column; }

		.search-wrapper { width: 100%; }

		.page-title { font-size: 1.4rem; }

		.page-body { flex-direction: column; }

		.sidebar {
			flex-direction: row;
			width: 100%;
			min-width: 0;
			margin-top: 0;
			overflow-x: auto;
			gap: 0;
		}

		.tab {
			border-left: none;
			border-bottom: 2px solid transparent;
			border-radius: 0;
			padding: 0.6rem 0.75rem;
			white-space: nowrap;
		}

		.tab.active {
			border-left-color: transparent;
			border-bottom-color: var(--accent, #ff6b9d);
		}

		.friend-card {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.6rem;
		}

		.friend-actions { width: 100%; }

		.friend-actions .btn {
			flex: 1;
			text-align: center;
			justify-content: center;
		}
	}
</style>
