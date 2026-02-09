<script lang="ts">
	import logo from '$lib/assets/favicon.ico';

	type Props = {
		user: {
			id: number;
			username: string;
			email: string;
			name: string;
			avatar_url: string | null;
		} | null;
	};

	let { user }: Props = $props();
	let dropdownOpen = $state(false);

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen;
	}

	function closeDropdown() {
		dropdownOpen = false;
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.dropdown-wrapper')) {
			closeDropdown();
		}
	}

	function getInitials(name: string): string {
		if (!name) return '?';
		return name
			.split(' ')
			.map(word => word[0]?.toUpperCase())
			.filter(Boolean)
			.join('')
			.slice(0, 2);
	}
</script>

<svelte:window onclick={handleClickOutside} />

<header>
	<div class="border-b">
		<nav class="header-nav">
			<a href="/" class="brand" onclick={closeDropdown}>
				<img src={logo} alt="PONG logo" class="brand-logo" />
				<span class="brand-name">PONG</span>
			</a>

			<div class="nav-links">
				{#if user}
					<a href="/play" class="nav-link">Play</a>
					<a href="/leaderboard" class="nav-link">Leaderboard</a>
					<a href="/tournaments" class="nav-link">Tournaments</a>
					<a href="/friends" class="nav-link">Friends</a>
				{:else}
					<a href="/instructions" class="nav-link">Instructions</a>
					<a href="/about" class="nav-link">About</a>
				{/if}
			</div>

			<div class="header-right">
				{#if user}
					<div class="dropdown-wrapper">
						<button
							class="avatar-trigger"
							onclick={toggleDropdown}
							aria-expanded={dropdownOpen}
							aria-haspopup="true"
						>
							<span class="avatar-name">{user.username}</span>
							<span class="avatar-circle">
								{#if user.avatar_url}
									<img src={user.avatar_url} alt="Avatar" class="avatar-img" />
								{:else}
									<span class="avatar-initials">
										{getInitials(user.name || user.username)}
									</span>
								{/if}
							</span>
						</button>
						{#if dropdownOpen}
							<div class="dropdown-menu" role="menu">
								<!-- User info at top of dropdown -->
								<div class="dropdown-user-info">
									<p class="dropdown-username">{user.name || user.username}</p>
									<p class="dropdown-email">{user.email}</p>
								</div>

								<hr class="dropdown-divider" />
								<!-- Menu items — each closes dropdown on click -->
								<a href="/profile" class="dropdown-item" role="menuitem" onclick={closeDropdown}>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
										<circle cx="12" cy="7" r="4" />
									</svg>
									Profile
								</a>

								<a href="/settings" class="dropdown-item" role="menuitem" onclick={closeDropdown}>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<circle cx="12" cy="12" r="3" />
										<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
									</svg>
									Settings
								</a>
								<hr class="dropdown-divider" />
								<form method="POST" action="/logout">
									<button type="submit" class="dropdown-item logout-item" role="menuitem">
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
											<polyline points="16 17 21 12 16 7" />
											<line x1="21" y1="12" x2="9" y2="12" />
										</svg>
										Logout
									</button>
								</form>
							</div>
						{/if}
					</div>

				{:else}
					<a href="/login" class="btn-login">Login</a>
					<a href="/register" class="btn-signup">Sign Up</a>
				{/if}
			</div>
		</nav>
	</div>
</header>
