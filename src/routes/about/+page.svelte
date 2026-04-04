<script lang="ts">
</script>

<!-- Idea of how can look the About page. -->
<!-- Have on mind that i haven incorporate everything, correctly until is compleately approve -->
<div class="about-page">
	<!-- Header -->
	<div class="max-w-4xl mx-auto px-4 py-10">
		<div class="page-header">
			<div class="page-tag">Ft_transcendence</div>
			<h1 class="page-title">
				We built this<br />
				<span class="glow-text">for Pong lovers</span>
			</h1>
			<p class="page-sub">
				A modern multiplayer Pong platform made at 42 Berlin.
			</p>
			<div class="hero-badge">
				<span>🎮</span> 42 Berlin · Final Project · 2025/2026
			</div>
		</div>
		<section class="section">
			<h2 class="section-title">
				<span class="title-bar accent"></span>
				The Project</h2>
			<p class="text-gray-300 leading-relaxed">
				ft_transcendence is our take on a polished, social-first Pong experience.<br>
				It combines competitive matches, player profiles, and progression systems.<br>
			</p>
			<p>
				<br>
				We built the app with <strong>SvelteKit</strong> for a fast, reactive frontend.
				Data is stored in <strong>PostgreSQL</strong> and modeled with <strong>Drizzle ORM</strong>.
				<br /><br />
				Authentication is handled with <strong>Lucia</strong>, and validation uses
				<strong>Zod</strong> for safer server-side and client-side inputs.
				<br /><br />
				The result is a game platform focused on reliability, smooth gameplay, and clean UX.
			</p>
			<p class="text-gray-300 leading-relaxed mt-4">
				<strong>Goal:</strong> Make online Pong feel fun, fair, and easy to jump into.
			</p>
		</section>
		<section class="section">
			<h2 class="section-title">
				<span class="title-bar blue"></span>
				Tech Stack</h2>
			<div class="tech-grid">
				<div class="tech-item s">
					<span class="tech-icon">⚡</span>
					<div>
						<strong>SvelteKit</strong>
						<p>Frontend framework and full-stack app runtime.</p>
					</div>
				</div>
				<div class="tech-item po">
					<span class="tech-icon">🐘</span>
					<div>
						<strong>PostgreSQL</strong>
						<p>Relational database for users, games, and progression.</p>
					</div>
				</div>
				<div class="tech-item d">
					<span class="tech-icon">💧</span>
					<div>
						<strong>Drizzle ORM</strong>
						<p>Type-safe schema and query layer.</p>
					</div>
				</div>
				<div class="tech-item c">
					<span class="tech-icon">🐳</span>
					<div>
						<strong>Docker</strong>
						<p>Containerized development and deployment workflow.</p>
					</div>
				</div>
				<div class="tech-item t">
					<span class="tech-icon">🔷</span>
					<div>
						<strong>TypeScript</strong>
						<p>Static typing for maintainable code.</p>
					</div>
				</div>
				<div class="tech-item l">
					<span class="tech-icon">🔐</span>
					<div>
						<strong>Lucia + Argon2</strong>
						<p>Secure authentication and password hashing.</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Team card -->
		<section class="section">
			<h2 class="section-title">
				<span class="title-bar purple"></span>
				Team</h2>
			<p class="section-sub">
				The developers behind ft_transcendence.
			</p>
			<div class="team-grid">

				<!-- Karen Bolon -->
				<div class="team-card">
					<div class="avatar">⚡</div>
					<h3 class="member-name">Karen Bolon</h3>
					<p class="member-role">Frontend, design systems, and product polish.</p>
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
					<div class="avatar">🚀</div>
					<h3 class="member-name">James Dyar</h3>
					<p class="member-role">Backend architecture and game systems.</p>
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
					<div class="avatar">🎮</div>
					<h3 class="member-name">Finn Dunkel</h3>
					<p class="member-role">Gameplay logic and real-time features.</p>
					<div class="member-links">
						<a href="https://github.com/finndark42" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
						</a>
						<a href="https://profile.intra.42.fr/users/fdunkel" target="_blank" rel="noopener noreferrer" aria-label="42 Intra">
							<svg viewBox="0 0 24 24" fill="currentColor"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="14" font-weight="bold">42</text></svg>
						</a>
						<a href="https://www.linkedin.com/in/finn-dunkel-61b2a03b2/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
						</a>
					</div>
				</div>

				<!-- Kellen Ramos -->
				<div class="team-card">
					<div class="avatar">🎨</div>
					<h3 class="member-name">Kellen Ramos</h3>
					<p class="member-role">UI/UX implementation and visual identity.</p>
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

		<!-- 42 BERLIN SECTION-->
		<section class="section">
			<div class="school-banner">
				<div class="school-logo">🎓</div>
				<h2 class="school-name"><strong>42 Berlin</strong></h2>
				<p class="text-gray-300 leading-relaxed">
					<a href="https://42berlin.de" target="_blank" rel="noopener noreferrer" class="accent-link"><strong>42</strong></a>
					is a coding school with a peer-to-peer learning model and project-based curriculum.
				</p>
				<p class="text-gray-400 text-sm mt-4">
					<br>Built with teamwork, late nights, and a lot of Pong. 🏓
				</p>
			</div>
		</section>

	</div>
</div>

<style>
	.about-page {
		min-height: 100%;
		width: 100%;
	}

	/* ── Header ── */
	.page-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.page-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.85rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 107, 157, 0.15);
		background: rgba(255, 107, 157, 0.06);
		margin-bottom: 1rem;
		font-size: 0.8rem;
		color: #ff6b9d;
		font-weight: 500;
	}

	.page-title {
		font-size: 3.5rem;
		font-weight: 800;
		color: #fff;
		margin: 0 0 0.5rem;
		line-height: 1.15;
	}

	.glow-text {
		background: linear-gradient(135deg, #ff6b9d, #a855f7);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		display: inline-block;
	}

	.page-sub {
		font-size: 1rem;
		color: #9ca3af;
		line-height: 1.7;
		max-width: 560px;
		margin: 0 auto;
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

	.title-bar {
		display: inline-block;
		width: 4px;
		height: 18px;
		border-radius: 2px;
	}

	.title-bar.accent {
		background: #ff6b9d;
	}
	.title-bar.purple {
		background: #a855f7;
	}

	.title-bar.blue {
		background: #60a5fa;
	}

	.tech-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 1.25rem;
		margin-top: 1rem;
	}

	.tech-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem;
		border-radius: 0.85rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		position: relative;
		overflow: hidden;
		transition: all 0.25s;
	}

	.tech-item:hover{
		border-color: rgba(255, 255, 255, 0.1);
		transform: translateY(-2px);
	}

	.tech-item::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		opacity: 0.5;
	}

	.tech-item.s::before{
		background: linear-gradient(
			90deg,
			transparent,
			#ff6b9d,
			transparent
		);
	}

	.tech-item.po::before {
		background: linear-gradient(
			90deg,
			transparent,
			#a855f7,
			transparent
		);
	}
	.tech-item.d::before {
		background: linear-gradient(
			90deg,
			transparent,
			#60a5fa,
			transparent
		);
	}
	.tech-item.l::before {
		background: linear-gradient(
			90deg,
			transparent,
			#c3de4a,
			transparent
		);
	}

	.tech-item.c::before {
		background: linear-gradient(
			90deg,
			transparent,
			#4ade80,
			transparent
		);
	}

	.tech-item.t::before {
		background: linear-gradient(
			90deg,
			transparent,
			#152fd6,
			transparent
		);
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
	.team-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.25rem;
		margin-top: 1.25rem;
	}
	.team-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 1rem;
		padding: 1.75rem 1.25rem;
		text-align: center;
		transition: transform 0.2s, border-color 0.2s;

		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		position: relative;
		overflow: hidden;
	}

	.team-card:hover {
		transform: translateY(-3px);
		border-color: rgba(255, 107, 157, 0.3);
	}

	.team-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		opacity: 0;
		background: linear-gradient(
			90deg,
			transparent,
			#ff6b9d,
			transparent
		);
		transition: opacity 0.25s;
	}

	.team-card:hover::before {
		opacity: 1;
	}

	.avatar {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.75rem;
		border: 2px solid rgba(255, 255, 255, 0.08);
		background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.05));
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

	.accent-link {
		color: #ff6b9d;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.accent-link:hover {
		color: #ff8db5;
	}

	/* ── School Banner ── */
	.school-banner {
		padding: 2rem;
		border-radius: 1rem;
		background: linear-gradient(
			135deg,
			rgba(168, 85, 247, 0.06),
			rgba(255, 107, 157, 0.04)
		);
		border: 1px solid rgba(168, 85, 247, 0.1);
		text-align: center;
		position: relative;
		overflow: hidden;
	}

	.school-banner::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(
			90deg,
			transparent,
			#a855f7,
			#ff6b9d,
			transparent
		);
		opacity: 0.5;
	}

	.school-logo {
		font-size: 2.5rem;
		margin-bottom: 0.75rem;
	}

	.school-name {
		font-size: 1.1rem;
		font-weight: 700;
		color: #fff;
		margin-bottom: 0.35rem;
	}

	@media (max-width: 640px) {
		.team-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
