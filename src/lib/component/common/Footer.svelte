<script lang="ts">
	import logo from '$lib/assets/favicon.ico';

	const currentYear = new Date().getFullYear();

	let { user } = $props();
	let openPopup: 'github' | 'linkedin' | null = $state(null);

	const team = [
		{ name: 'Finn Dunkel', initials: 'FD', github: 'https://github.com/finndark42', linkedin: null },
		{ name: 'James Dyar', initials: 'JD', github: 'https://github.com/allthetimeintheworld', linkedin: 'https://www.linkedin.com/in/james-dyar-657688218/' },
		{ name: 'Karen Bolon', initials: 'KB', github: 'https://github.com/karenbolon', linkedin: 'https://www.linkedin.com/in/karenbolon/' },
		{ name: 'Kellen Ramos', initials: 'KR', github: 'https://github.com/kellenr', linkedin: 'https://www.linkedin.com/in/kellenr/' },
	];

	function togglePopup(popup: 'github' | 'linkedin') {
		openPopup = openPopup === popup ? null : popup;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.follow-popup-wrapper')) {
			openPopup = null;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<footer>
	<div class="footer-content">
		<div class="footer-top">
			<div class="footer-brand">
				<a href="/" class="brand">
					<img src={logo} alt="PONG logo" class="brand-logo" />
					<span class="brand-name">PONG</span>
				</a>
				<p class="brand-tagline">The classic game, reimagined.</p>
			</div>

			<div class="footer-links">
				<div class="link-column">
					<h3>Resources</h3>
					{#if user}
						<ul>
							<li><a href="/play">Play</a></li>
							<li><a href="/leaderboard">Leaderboard</a></li>
							<li><a href="/tournaments">Tournaments</a></li>
							<li><a href="/instructions">Instructions</a></li>
						</ul>
					{:else}
						<ul>
							<li><a href="/play">Play</a></li>
							<li><a href="/instructions">Instructions</a></li>
							<li><a href="/leaderboard">Leaderboard</a></li>
						</ul>
					{/if}
				</div>

				<div class="link-column">
					<h3>Follow Us</h3>
					<ul>
						<li class="follow-popup-wrapper">
							<button class="follow-trigger" onclick={() => togglePopup('github')}>
								GitHub
							</button>
							{#if openPopup === 'github'}
								<div class="follow-popup">
									{#each team as member}
										<a href={member.github} target="_blank" rel="noopener noreferrer" class="follow-popup-item">
											<span class="follow-avatar">{member.initials}</span>
											<span class="follow-name">{member.name}</span>
										</a>
									{/each}
								</div>
							{/if}
						</li>
						<li class="follow-popup-wrapper">
							<button class="follow-trigger" onclick={() => togglePopup('linkedin')}>
								LinkedIn
							</button>
							{#if openPopup === 'linkedin'}
								<div class="follow-popup">
									{#each team.filter(m => m.linkedin) as member}
										<a href={member.linkedin} target="_blank" rel="noopener noreferrer" class="follow-popup-item">
											<span class="follow-avatar">{member.initials}</span>
											<span class="follow-name">{member.name}</span>
										</a>
									{/each}
								</div>
							{/if}
						</li>
					</ul>
				</div>

				<div class="link-column">
					<h3>Legal</h3>
					<ul>
						<li><a href="/privacy">Privacy Policy</a></li>
						<li><a href="/terms">Terms of Service</a></li>
					</ul>
				</div>

				<div class="link-column">
					<h3>About</h3>
					<ul>
						<li><a href="/about">Our Team</a></li>
						<li>
							<a href="https://42berlin.de" target="_blank" rel="noopener noreferrer">
								42 Berlin
							</a>
						</li>
					</ul>
				</div>
			</div>
		</div>

		<hr class="footer-divider" />

		<div class="footer-bottom">
			<p class="copyright">
				© {currentYear} ft_transcendence™ — All rights reserved.
			</p>

			<div class="social-icons">
				<a href="https://github.com/karenbolon/Transcendence" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
				</a>

				<a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
					</svg>
				</a>

				<a href="https://profile.intra.42.fr" target="_blank" rel="noopener noreferrer" aria-label="42 Intra">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="20" font-weight="bold">42</text>
					</svg>
				</a>
			</div>
		</div>
	</div>
</footer>

<style>
	.brand-name {
		color: #fff;
	}

	.brand-tagline {
		font-size: 1.05rem;
		color: #6b7280;
		margin-top: 0.8rem;
	}

	/* Column heading style */
	.link-column h3 {
		font-size: 0.95rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: #fff;
		margin-bottom: 1rem;
	}

	/* Follow Us popup styles */
	.follow-popup-wrapper {
		position: relative;
	}

	.follow-trigger {
		background: none;
		border: none;
		color: #9ca3af;
		font-size: inherit;
		font-family: inherit;
		padding: 0;
		cursor: pointer;
		transition: color 0.2s;
	}

	.follow-trigger:hover {
		color: #ff6b9d;
	}

	.follow-popup {
		position: absolute;
		bottom: calc(100% + 0.5rem);
		left: 0;
		background: #16213e;
		border: 1px solid rgba(255, 107, 157, 0.2);
		border-radius: 0.5rem;
		padding: 0.5rem;
		min-width: 200px;
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
		z-index: 50;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.follow-popup-item {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.45rem 0.6rem;
		border-radius: 0.375rem;
		text-decoration: none;
		color: #e5e5e5;
		transition: background 0.15s;
	}

	.follow-popup-item:hover {
		background: rgba(255, 107, 157, 0.1);
	}

	.follow-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ff6b9d, #c084fc);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.65rem;
		font-weight: 700;
		color: #fff;
		flex-shrink: 0;
	}

	.follow-name {
		font-size: 0.85rem;
		white-space: nowrap;
	}
</style>