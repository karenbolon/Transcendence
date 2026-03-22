<script lang="ts">
	import type { PageData } from './$types';
	import Dashboard from '$lib/component/Dashboard.svelte';
	import Aurora from '$lib/component/effect/Aurora.svelte';
	import Scanlines from '$lib/component/effect/Scanlines.svelte';

	let { data } : { data: PageData } = $props();
</script>

<Aurora />
<Scanlines opacity={0.04} />

{#if data.loggedIn}
	<Dashboard
		user={data.user}
		globalLeaderboard={data.globalLeaderboard}
		friendsLeaderboard={data.friendsLeaderboard}
		activityFeed={data.activityFeed}
		openTournaments={data.openTournaments}
	/>
{:else}
	<!-- LANDING PAGE (not logged in) -->
	<div class="home-page">
		<div class="bg-animation" aria-hidden="true">
			<div class="ball"></div>
		</div>

		<div class="max-w-4xl mx-auto px-4 py-8 relative">
			<div>
				<div class="hero-content">
					<h1 class="brand-name text-center animate-float text-glow">
						PONG
					</h1>
					<p class="hero-tagline">
						The classic arcade game, reimagined for the modern web.
					</p>
					<p class="hero-sub">
						Challenge your friends, the computer or Pixie our AI opponent
						in this timeless game of skill and reflexes.
					</p>
					<section class="hero-buttons">
						<div class="flex justify-center gap-4 mt-8">
							<a href="/play" class="btn-signup">🎮 Play Now</a>
							<a href="/register" class="btn-instructions">👤 Create an Account</a>
							<a href="/instructions" class="btn-login">📖 How to Play</a>
						</div>
						<div class="login-link-container">
							<a href="/login" class="login-link">Already a player? →</a>
						</div>
					</section>
				</div>
			</div>

			<section>
				<div class="features-grid">
					<div class="feature-card">
						<div class="feature-icon">🏓</div>
						<h3 class="feature-title">Classic Gameplay</h3>
						<p class="feature-desc">Experience the timeless Pong mechanics with modern polish</p>
					</div>
					<div class="feature-card">
						<div class="feature-icon">🌐</div>
						<h3 class="feature-title">Play Online</h3>
						<p class="feature-desc">Challenge players from anywhere in real-time</p>
					</div>
					<div class="feature-card">
						<div class="feature-icon">🏆</div>
						<h3 class="feature-title">Leaderboards</h3>
						<p class="feature-desc">Compete for the top spots and track your rank</p>
					</div>
					<div class="feature-card">
						<div class="feature-icon">💬</div>
						<h3 class="feature-title">Friends & Chat</h3>
						<p class="feature-desc">Connect with players, chat, and send game invites</p>
					</div>
				</div>
			</section>

			<section class="how-section">
				<h2 class="how-title">How It Works</h2>
				<div class="steps-grid">
					<div class="step">
						<span class="step-number">1</span>
						<h3 class="step-name">Create an Account</h3>
						<p class="step-desc">Sign up in seconds and set up your profile.</p>
					</div>
					<div class="step-arrow" aria-hidden="true">→</div>
					<div class="step">
						<span class="step-number">2</span>
						<h3 class="step-name">Find a Match</h3>
						<p class="step-desc">Play locally, vs AI, or find an opponent online.</p>
					</div>
					<div class="step-arrow" aria-hidden="true">→</div>
					<div class="step">
						<span class="step-number">3</span>
						<h3 class="step-name">Climb the Ranks</h3>
						<p class="step-desc">Win games, build your streak, and top the leaderboard.</p>
					</div>
				</div>
			</section>

			<section class="bottom-cta">
				<h2 class="cta-title">Ready to <span class="glow-text">compete</span>?</h2>
				<p class="cta-desc">
					Join the game and show everyone what you've got.<br>
					Earn some achievements and climb the Leaderboard.
				</p>
				<div class="flex justify-center gap-4">
					<a href="/register" class="btn-signup">🕹️ Get Started</a>
					<a href="/instructions" class="btn-login">Learn More</a>
				</div>
			</section>
		</div>
	</div>
{/if}


<style>
	/* LANDING PAGE STYLES */
	.home-page {
		position: relative;
		overflow: hidden;
	}

	.glow-text {
		background: linear-gradient(135deg, #ff6b9d, #a855f7);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		display: inline-block;
	}

	.bg-animation {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}

	.ball {
		position: absolute;
		width: 12px;
		height: 12px;
		background: var(--accent);
		border-radius: 50%;
		opacity: 0.15;
		animation: bounce-ball 8s linear infinite;
	}

	@keyframes bounce-ball {
		0%   { top: 20%; left: 5%;  }
		25%  { top: 60%; left: 45%; }
		50%  { top: 15%; left: 85%; }
		75%  { top: 70%; left: 40%; }
		100% { top: 20%; left: 5%;  }
	}

	.hero-content {
		text-align: center;
	}

	.brand-name {
		display: flex;
		justify-content: center;
		color: #fff;
		font-size: 12rem;
		padding: 6rem 3.25rem 2rem;
	}

	.hero-tagline {
		color: #fff;
		font-size: 1.25rem;
		font-weight: 600;
		text-align: center;
		margin: 0;
	}

	.hero-sub {
		color: #9ca3af;
		font-size: 0.95rem;
		text-align: center;
		max-width: 500px;
		margin: 0.75rem auto 0;
		line-height: 1.6;
	}

	.features-grid {
		margin-top: 4rem;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1.25rem;
	}

	.feature-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 1rem;
		padding: 1.5rem 1rem;
		text-align: center;
		transition: transform 0.2s, border-color 0.2s;
	}

	.feature-card:hover {
		transform: translateY(-4px);
		border-color: rgba(255, 107, 157, 0.3);
	}

	.feature-icon {
		font-size: 2.25rem;
		margin-bottom: 0.75rem;
	}

	.feature-title {
		color: var(--accent);
		font-weight: 600;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}

	.feature-desc {
		color: #9ca3af;
		font-size: 0.8rem;
		line-height: 1.4;
		margin: 0;
	}

	.how-section {
		margin-top: 4rem;
		padding-top: 3rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		text-align: center;
	}

	.how-title {
		font-size: 1.35rem;
		font-weight: 700;
		color: #fff;
		margin-bottom: 2rem;
	}

	.steps-grid {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		gap: 1.5rem;
	}

	.step {
		max-width: 180px;
		text-align: center;
	}

	.step-number {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		background: var(--accent);
		color: #fff;
		font-size: 1rem;
		font-weight: 700;
		margin-bottom: 0.75rem;
	}

	.step-name {
		color: #fff;
		font-size: 0.9rem;
		font-weight: 600;
		margin: 0 0 0.375rem;
	}

	.step-desc {
		color: #9ca3af;
		font-size: 0.8rem;
		line-height: 1.4;
		margin: 0;
	}

	.step-arrow {
		color: var(--accent);
		font-size: 1.5rem;
		margin-top: 0.5rem;
		opacity: 0.5;
	}

	.btn-instructions {
		background: rgba(255, 107, 157, 0.05);
		border: 1px solid rgba(255, 107, 157, 0.15);
		padding: 0.5rem 1.25rem;
		border-radius: 0.75rem;
		font-weight: 600;
		font-size: 1.15rem;
	}

	.btn-instructions:hover {
		background-color: var(--accent-muted);
	}

	.login-link-container {
		margin-top: 1rem;
	}

	.login-link {
		color: #ff6b9d;
		text-decoration: none;
		font-weight: 500;
	}

	.login-link:hover {
		text-decoration: underline;
	}

	.bottom-cta {
		margin-top: 4rem;
		padding: 3rem 1.5rem;
		background: rgba(255, 107, 157, 0.05);
		border: 1px solid rgba(255, 107, 157, 0.15);
		border-radius: 1.5rem;
		text-align: center;
	}

	.cta-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #fff;
		margin: 0 0 0.5rem;
	}

	.cta-desc {
		color: #9ca3af;
		font-size: 0.95rem;
		margin-bottom: 1.5rem;
	}

	/* RESPONSIVE */
	@media (max-width: 768px) {
		.brand-name {
			font-size: 6rem;
			padding: 4rem 1rem 1.5rem;
		}

		.features-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.steps-grid {
			flex-direction: column;
			align-items: center;
		}

		.step-arrow {
			transform: rotate(90deg);
		}
	}

	@media (max-width: 480px) {
		.features-grid {
			grid-template-columns: 1fr;
		}
	}
</style>