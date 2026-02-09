<!-- ═══════════════════════════════════════════════════════════════════════════
     ABOUT PAGE — src/routes/(pages)/about/+page.svelte

     This page showcases the team and project.
     Uses Tailwind utility classes (like the Terms page) + custom styles
     scoped to this component for the team cards and gaming theme.
═══════════════════════════════════════════════════════════════════════════ -->

<div class="about-page">
	<div class="max-w-4xl mx-auto px-4 py-10">

		<!-- ═══════════════════════════════════════════════════════════════
		     HERO SECTION — Project title with gaming flair
		     ═══════════════════════════════════════════════════════════════ -->
		<div class="hero">
			<h1 class="game-title hero-title">ft_transcendence</h1>
			<p class="hero-subtitle">
				A real-time multiplayer Pong platform — the classic game, reimagined.
			</p>
			<div class="hero-badge">
				<span>🎮</span> 42 Berlin · Final Project · 2025/2026
			</div>
		</div>

		<!-- ═══════════════════════════════════════════════════════════════
		     ABOUT THE PROJECT
		     ═══════════════════════════════════════════════════════════════ -->
		<section class="section">
			<h2 class="section-title">About the Project</h2>
			<p class="text-gray-300 leading-relaxed">
				ft_transcendence is the final project of the 42 common core curriculum.
				It challenges students to build a full-stack web application from scratch —
				a multiplayer Pong game complete with real-time gameplay, user authentication,
				tournaments, and social features.
			</p>
			<p class="text-gray-300 leading-relaxed mt-4">
				Our goal: make something that's not just functional, but genuinely
				fun to play and beautiful to look at. 🏓✨
			</p>
		</section>

		<!-- ═══════════════════════════════════════════════════════════════
		     TECH STACK — What we built it with
		     ═══════════════════════════════════════════════════════════════ -->
		<section class="section">
			<h2 class="section-title">Tech Stack</h2>
			<div class="tech-grid">
				<div class="tech-item">
					<span class="tech-icon">⚡</span>
					<div>
						<strong>SvelteKit</strong>
						<p>Frontend & Backend</p>
					</div>
				</div>
				<div class="tech-item">
					<span class="tech-icon">🐘</span>
					<div>
						<strong>PostgreSQL</strong>
						<p>Database</p>
					</div>
				</div>
				<div class="tech-item">
					<span class="tech-icon">💧</span>
					<div>
						<strong>Drizzle ORM</strong>
						<p>Database Toolkit</p>
					</div>
				</div>
				<div class="tech-item">
					<span class="tech-icon">🐳</span>
					<div>
						<strong>Docker</strong>
						<p>Containerization</p>
					</div>
				</div>
				<div class="tech-item">
					<span class="tech-icon">🔷</span>
					<div>
						<strong>TypeScript</strong>
						<p>Type Safety</p>
					</div>
				</div>
				<div class="tech-item">
					<span class="tech-icon">🔐</span>
					<div>
						<strong>Lucia + Argon2</strong>
						<p>Authentication</p>
					</div>
				</div>
			</div>
		</section>

		<!-- ═══════════════════════════════════════════════════════════════
		     THE TEAM — One card per member

		     Each card has:
		     - Avatar placeholder (initials in a circle)
		     - Name
		     - Role
		     - Social links (GitHub, LinkedIn, 42 Intra)

		     WHY initials instead of real photos?
		     - No need to host image files
		     - Always looks clean
		     - Can be replaced with real avatars later
		     ═══════════════════════════════════════════════════════════════ -->
		<section class="section">
			<h2 class="section-title">Meet the Team</h2>
			<div class="team-grid">

				<!-- Karen Bolon -->
				<div class="team-card">
					<div class="avatar">KB</div>
					<h3 class="member-name">Karen Bolon</h3>
					<p class="member-role">Product Owner · Frontend</p>
					<div class="member-links">
						<a href="https://github.com/karenbolon" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
							<!-- GitHub SVG -->
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
						</a>
						<a href="https://www.linkedin.com/in/karenbolon/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
							<!-- LinkedIn SVG -->
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
						</a>
						<a href="https://profile.intra.42.fr/users/kbolon" target="_blank" rel="noopener noreferrer" aria-label="42 Intra">
							<!-- 42 SVG -->
							<svg viewBox="0 0 24 24" fill="currentColor"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="14" font-weight="bold">42</text></svg>
						</a>
					</div>
				</div>

				<!-- James Dyar -->
				<div class="team-card">
					<div class="avatar">JD</div>
					<h3 class="member-name">James Dyar</h3>
					<p class="member-role">Developer · Backend</p>
					<div class="member-links">
						<a href="https://github.com/allthetimeintheworld" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
						</a>
						<a href="https://www.linkedin.com/in/james-dyar-657688218/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
						</a>
						<a href="https://profile.intra.42.fr/users/jadyar" target="_blank" rel="noopener noreferrer" aria-label="42 Intra">
							<svg viewBox="0 0 24 24" fill="currentColor"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="14" font-weight="bold">42</text></svg>
						</a>
					</div>
				</div>

				<!-- Finn Dunkel -->
				<div class="team-card">
					<div class="avatar">FD</div>
					<h3 class="member-name">Finn Dunkel</h3>
					<p class="member-role">Developer · Backend</p>
					<div class="member-links">
						<a href="https://github.com/finndark42" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
						</a>
						<a href="https://profile.intra.42.fr/users/fdunkel" target="_blank" rel="noopener noreferrer" aria-label="42 Intra">
							<svg viewBox="0 0 24 24" fill="currentColor"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="14" font-weight="bold">42</text></svg>
						</a>
					</div>
				</div>

				<!-- Kellen Ramos -->
				<div class="team-card">
					<div class="avatar">KR</div>
					<h3 class="member-name">Kellen Ramos</h3>
					<p class="member-role">Developer · Frontend</p>
					<div class="member-links">
						<a href="https://github.com/kellenr" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
						</a>
						<a href="https://www.linkedin.com/in/kellenr/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
						</a>
						<a href="https://profile.intra.42.fr/users/keramos-" target="_blank" rel="noopener noreferrer" aria-label="42 Intra">
							<svg viewBox="0 0 24 24" fill="currentColor"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="14" font-weight="bold">42</text></svg>
						</a>
					</div>
				</div>

			</div>
		</section>

		<!-- ═══════════════════════════════════════════════════════════════
		     42 BERLIN SECTION
		     ═══════════════════════════════════════════════════════════════ -->
		<section class="section">
			<h2 class="section-title">Built at 42 Berlin</h2>
			<p class="text-gray-300 leading-relaxed">
				<a href="https://42berlin.de" target="_blank" rel="noopener noreferrer" class="accent-link">42 Berlin</a>
				is a tuition-free, peer-to-peer coding school where students learn by building
				real projects. ft_transcendence is the capstone project of the common core —
				the ultimate test of everything we've learned.
			</p>
			<p class="text-gray-400 text-sm mt-4">
				No teachers. No lectures. Just code, collaboration, and a whole lot of Pong. 🏓
			</p>
		</section>

	</div>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     SCOPED STYLES — Only affect this About page
═══════════════════════════════════════════════════════════════════════════ -->
<style>
	/* ═════════════════════════════════════════════════
	   PAGE BASE
	   ═════════════════════════════════════════════════ */
	.about-page {
		min-height: 100%;
		width: 100%;
	}

	/* ═════════════════════════════════════════════════
	   HERO SECTION — The big title at the top

	   text-align: center → Centers all child text
	   margin-bottom: 3rem → Space before the next section
	   ═════════════════════════════════════════════════ */
	.hero {
		text-align: center;
		margin-bottom: 3rem;
	}

	.hero-title {
		font-size: 2.5rem;
		margin-bottom: 0.75rem;
	}

	.hero-subtitle {
		font-size: 1.125rem;
		color: #d1d5db;
		max-width: 500px;
		margin: 0 auto;
		line-height: 1.6;
	}

	/* The little badge: "🎮 42 Berlin · Final Project · 2025/2026" */
	.hero-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1.25rem;
		padding: 0.4rem 1rem;
		border-radius: 9999px;
		font-size: 0.8rem;
		color: #d1d5db;
		background: rgba(255, 107, 157, 0.1);
		border: 1px solid rgba(255, 107, 157, 0.2);
	}

	/* ═════════════════════════════════════════════════
	   SECTIONS — Repeating content blocks

	   Each section gets a subtle top border to visually
	   separate it from the section above.
	   ═════════════════════════════════════════════════ */
	.section {
		margin-top: 2.5rem;
		padding-top: 2.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.section-title {
		font-size: 1.35rem;
		font-weight: 700;
		color: #fff;
		margin-bottom: 1rem;
	}

	/* ═════════════════════════════════════════════════
	   TECH STACK GRID

	   CSS Grid with auto-fill creates a responsive grid:
	   - Each item is at least 180px wide
	   - On big screens: 3 columns
	   - On small screens: automatically fewer columns
	   - No media query needed — CSS Grid handles it!
	   ═════════════════════════════════════════════════ */
	.tech-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	.tech-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
	}

	.tech-icon {
		font-size: 1.5rem;
	}

	.tech-item strong {
		color: #fff;
		font-size: 0.875rem;
	}

	.tech-item p {
		color: #9ca3af;
		font-size: 0.75rem;
		margin: 0;
	}

	/* ═════════════════════════════════════════════════
	   TEAM GRID — 2x2 card layout

	   repeat(2, 1fr) → always 2 columns
	   On mobile: switches to 1 column
	   ═════════════════════════════════════════════════ */
	.team-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.25rem;
		margin-top: 1.25rem;
	}

	/* ═════════════════════════════════════════════════
	   TEAM CARD — Each team member's card

	   text-align: center → Everything inside is centered
	   transition: transform → Slight scale-up on hover
	   (a subtle "this is interactive" hint)
	   ═════════════════════════════════════════════════ */
	.team-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 1rem;
		padding: 1.75rem 1.25rem;
		text-align: center;
		transition: transform 0.2s, border-color 0.2s;
	}

	.team-card:hover {
		transform: translateY(-2px);
		border-color: rgba(255, 107, 157, 0.3);
	}

	/* ═════════════════════════════════════════════════
	   AVATAR — Circle with initials

	   width/height: 4rem → 64px circle
	   border-radius: 50% → Makes it a perfect circle
	   The pink gradient background matches your accent
	   ═════════════════════════════════════════════════ */
	.avatar {
		width: 4rem;
		height: 4rem;
		border-radius: 50%;
		background: linear-gradient(135deg, #ff6b9d, #ff8db5);
		color: #fff;
		font-weight: 700;
		font-size: 1.1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 0.75rem;
	}

	.member-name {
		color: #fff;
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}

	.member-role {
		color: #9ca3af;
		font-size: 0.8rem;
		margin: 0.25rem 0 0;
	}

	/* ═════════════════════════════════════════════════
	   SOCIAL LINKS — Icon row under each member

	   justify-content: center → Centers the icons
	   gap: 1rem → Space between icons
	   ═════════════════════════════════════════════════ */
	.member-links {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-top: 1rem;
	}

	.member-links a {
		color: #6b7280;
		transition: color 0.2s;
		display: flex;
	}

	.member-links a:hover {
		color: #ff6b9d;
	}

	.member-links svg {
		width: 1.15rem;
		height: 1.15rem;
	}

	/* ═════════════════════════════════════════════════
	   ACCENT LINK — Pink colored link with underline
	   ═════════════════════════════════════════════════ */
	.accent-link {
		color: #ff6b9d;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.accent-link:hover {
		color: #ff8db5;
	}

	/* ═════════════════════════════════════════════════
	   RESPONSIVE — Mobile layout

	   On screens smaller than 640px:
	   - Team grid becomes 1 column (cards stack)
	   - Hero title gets smaller
	   ═════════════════════════════════════════════════ */
	@media (max-width: 640px) {
		.team-grid {
			grid-template-columns: 1fr;
		}

		.hero-title {
			font-size: 1.75rem;
		}

		.hero-subtitle {
			font-size: 1rem;
		}
	}
</style>
