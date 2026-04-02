<script lang="ts">
	import logo from '$lib/assets/favicon.ico';
	// import Logout from './Logout.svelte'; // OLD (may rely on JS)
	import UserAvatar from './UserAvatar.svelte';
	import { afterNavigate } from '$app/navigation';
	import { isConnected } from '$lib/stores/socket.svelte';
	import { toggleChat, getTotalUnread } from '$lib/stores/chat.svelte';
	//chat
	//notifications

	type Props = {
		user: {
			id: string;
			username: string;
			email: string;
			name: string;
			avatar_url: string | null;
			is_online: boolean;
		} | null;
	};

	let { user }: Props = $props();

	// OLD (JS-driven menus — no longer needed for no-JS support)
	/*
	let dropdownOpen = $state(false);
	let mobileMenuOpen = $state(false);

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen;
	}

	function closeDropdown() {
		dropdownOpen = false;
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.dropdown-wrapper')) {
			closeDropdown();
		}
		if (!target.closest('.mobile-menu') && !target.closest('.hamburger-btn')) {
			closeMobileMenu();
		}
	}
	*/

	function handleChatClick(e: MouseEvent) {
		e.preventDefault();
		toggleChat();
	}

	// afterNavigate(() => {
	// 	mobileMenuOpen = false;
	// });

	// Old behavior:
	// <button class="chat-trigger" onclick={toggleChat} aria-label="Open chat">...</button>
</script>

<!-- <svelte:window onclick={handleClickOutside} /> -->

<header>
	<div class="border-b">
		<nav class="header-nav">
			<a href="/" class="brand">
				<img src={logo} alt="PONG logo" class="brand-logo" />
				<span class="brand-name">PONG</span>
			</a>

			<!-- OLD: JS hamburger -->
			<!--
			<button class="hamburger-btn" onclick={toggleMobileMenu} aria-label="Toggle menu" aria-expanded={mobileMenuOpen}>
			...
			</button>
			-->

			<!-- NEW (no-JS safe mobile menu) -->
			<details class="mobile-menu-wrapper">
				<summary class="hamburger-btn" aria-label="Toggle menu">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
						<path d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</summary>

				<div class="mobile-menu">
					{#if user}
						<a href="/play" class="mobile-menu-link">Play</a>
						<a href="/leaderboard" class="mobile-menu-link">Leaderboard</a>
						<a href="/tournaments" class="mobile-menu-link">Tournaments</a>
						<a href="/friends" class="mobile-menu-link">Friends</a>
						<a href="/profile" class="mobile-menu-link">Profile</a>
						<a href="/settings" class="mobile-menu-link">Settings</a>

						<!-- NEW (no-JS logout) -->
						<form method="POST" action="/logout" class="logout-form">
							<button type="submit" class="mobile-menu-link logout-button">Logout</button>
						</form>

						<!-- OLD -->
						<!-- <Logout class="mobile-menu-link logout-item">Logout</Logout> -->
					{:else}
						<a href="/instructions" class="mobile-menu-link">Instructions</a>
						<a href="/about" class="mobile-menu-link">About</a>
						<a href="/login" class="mobile-menu-link">Login</a>
						<a href="/register" class="mobile-menu-link">Sign Up</a>
					{/if}
				</div>
			</details>

			<div class="nav-links">
				{#if user}
					<a href="/play" class="nav-link">Play</a>
					<a href="/leaderboard" class="nav-link">Leaderboard</a>
					<a href="/tournaments" class="nav-link">Tournaments</a>
					<a href="/profile" class="nav-link">Profile</a>
					<a href="/friends" class="nav-link">Friends</a>
				{:else}
					<a href="/instructions" class="nav-link">Instructions</a>
					<a href="/about" class="nav-link">About</a>
				{/if}
			</div>

			<div class="header-right">
				{#if user}
					<!-- Chat button -->
					<!-- Old: <button class="chat-trigger" onclick={toggleChat} aria-label="Open chat"> -->
					<a href="/friends" class="chat-trigger" onclick={handleChatClick} aria-label="Open chat">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
							<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
						</svg>
						{#if getTotalUnread() > 0}
							<span class="chat-badge">{getTotalUnread()}</span>
						{/if}
					</a>

					<!-- OLD (JS dropdown) -->
					<!--
					<div class="dropdown-wrapper">
						<button onclick={toggleDropdown}>...</button>
					</div>
					-->

					<!-- NEW (no-JS safe dropdown) -->
					<details class="dropdown-wrapper">
						<summary class="avatar-trigger" aria-haspopup="menu">
							<span class="avatar-name">{user.name || user.username}</span>
							<UserAvatar
								username={user.username}
								displayName={user.name}
								avatarUrl={user.avatar_url}
								size="lg"
								status={isConnected() ? 'online' : 'offline'}
							/>
						</summary>

						<div class="dropdown-menu" role="menu">
							<div class="dropdown-user-info">
								<p class="dropdown-username">{user.name || user.username}</p>
								<p class="dropdown-email">{user.email}</p>
							</div>

							<hr class="dropdown-divider" />

							<a href="/profile" class="dropdown-item">Profile</a>
							<a href="/settings" class="dropdown-item">Settings</a>

							<hr class="dropdown-divider" />

							<!-- NEW (no-JS logout) -->
							<form method="POST" action="/logout" class="logout-form">
								<button type="submit" class="dropdown-item logout-button">
									Logout
								</button>
							</form>

							<!-- OLD -->
							<!-- <Logout class="dropdown-item logout-item">Logout</Logout> -->
						</div>
					</details>
				{:else}
					<a href="/login" class="btn-login">Login</a>
					<a href="/register" class="btn-signup">Sign Up</a>
				{/if}
			</div>
		</nav>
	</div>
</header>

<style>
	.chat-trigger {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: #9ca3af;
		cursor: pointer;
		padding: 0.4rem;
		border-radius: 0.4rem;
		text-decoration: none;
		transition: color 0.15s;
	}

	.chat-trigger:hover {
		color: #e5e7eb;
	}

	.chat-badge {
		position: absolute;
		top: -4px;
		right: -6px;
		background: #ff6b9d;
		color: white;
		font-size: 0.6rem;
		padding: 0.05rem 0.35rem;
		border-radius: 999px;
		font-weight: 700;
		min-width: 16px;
		text-align: center;
	}

	/* NEW helpers for details */
	.hamburger-btn,
	.avatar-trigger {
		list-style: none;
		cursor: pointer;
	}

	.hamburger-btn::-webkit-details-marker,
	.avatar-trigger::-webkit-details-marker {
		display: none;
	}

	.logout-form {
		margin: 0;
	}

	.logout-button {
		background: none;
		border: none;
		cursor: pointer;
		font: inherit;
		text-align: left;
		width: 100%;
	}
</style>