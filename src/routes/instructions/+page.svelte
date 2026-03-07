<script lang="ts">
	const modes = [
		{
			icon: '🤝',
			name: 'Local 1v1',
			desc: 'Two players, one keyboard. Classic couch gaming. Player 1 uses W/S, Player 2 uses arrow keys.',
			players: '👥 2 players, same device',
		},
		{
			icon: '🤖',
			name: 'vs Computer',
			desc: 'Practice against the AI. Great for warming up or learning the mechanics before going online.',
			players: '👤 Solo practice',
		},
		{
			icon: '🌐',
			name: 'Online Multiplayer',
			desc: 'Challenge players in real-time over WebSockets. Matchmake or invite friends directly from their profile.',
			players: '🌍 2 players, online',
		},
		{
			icon: '🏟️',
			name: 'Tournament',
			desc: 'Bracket-style competition. Join open tournaments, climb the bracket, and claim the championship title.',
			players: '🏆 4–8 players, bracket',
		},
	];

	const rules = [
		{
			text: '<strong>Score to win.</strong> The ball bounces between paddles. Score a point when your opponent misses the ball.',
		},
		{
			text: '<strong>First to the target wins.</strong> Default is 5 points. Tournament matches may use different targets. Choose from 3, 5, 7, or 11 points.',
		},
		{
			text: '<strong>Ball speeds up.</strong> Each rally makes the ball slightly faster. Longer rallies = more intense gameplay.',
		},
		{
			text: '<strong>Angle control.</strong> Where the ball hits your paddle affects its bounce angle. Hit with the edge for sharper angles.',
		},
		{
			text: '<strong>No pausing in online.</strong> Local and AI games can be paused. Online matches play continuously.',
		},
	];

	const speeds = [
		{
			emoji: '🐢',
			name: 'Chill',
			desc: 'Relaxed speed. Perfect for beginners and casual play.',
		},
		{
			emoji: '🏓',
			name: 'Normal',
			desc: 'Standard competitive speed. The default for ranked and tournaments.',
		},
		{
			emoji: '🔥',
			name: 'Fast',
			desc: 'High-speed chaos. For experienced players looking for a challenge.',
		},
	];

	const tips = [
		{
			icon: '🎯',
			text: '<strong>Use the edges.</strong> Hitting the ball with the edge of your paddle creates sharper angles that are harder to return.',
		},
		{
			icon: '🧠',
			text: "<strong>Anticipate, don't react.</strong> Watch the ball angle and start moving before it crosses the midline.",
		},
		{
			icon: '🏃',
			text: '<strong>Stay centered.</strong> After each return, move your paddle back toward the middle to cover more area.',
		},
		{
			icon: '💪',
			text: '<strong>Practice vs AI first.</strong> Computer mode is great for learning timing and paddle control before going online.',
		},
	];
</script>

<div class="instructions-page">
	<!-- Header -->
	<div class="page-header">
		<div class="page-tag">📖 How to Play</div>
		<h1 class="page-title">
			Learn the <span class="glow-text">basics</span>
		</h1>
		<p class="page-sub">
			Pong is simple to pick up but takes practice to master. Here's
			everything you need to know.
		</p>
	</div>

	<!-- Controls -->
	<section class="section">
		<h2 class="section-title"><span class="title-bar accent"></span> Controls</h2>
		<p class="section-sub">
			Different controls depending on the mode. In online play, everyone
			uses the same keys.
		</p>
		<div class="controls-grid">
			<div class="control-card">
				<div class="control-label">
					<span class="tag p1">Player 1</span> Left side
				</div>
				<div class="key-row">
					<kbd class="key">W</kbd>
					<span class="key-desc">Move paddle up</span>
				</div>
				<div class="key-row">
					<kbd class="key">S</kbd>
					<span class="key-desc">Move paddle down</span>
				</div>
			</div>
			<div class="control-card">
				<div class="control-label">
					<span class="tag p2">Player 2</span> Right side (local only)
				</div>
				<div class="key-row">
					<kbd class="key">↑</kbd>
					<span class="key-desc">Move paddle up</span>
				</div>
				<div class="key-row">
					<kbd class="key">↓</kbd>
					<span class="key-desc">Move paddle down</span>
				</div>
			</div>
		</div>
	</section>

	<div class="divider"></div>

	<!-- Game Modes -->
	<section class="section">
		<h2 class="section-title"><span class="title-bar purple"></span> Game Modes</h2>
		<p class="section-sub">
			Four ways to play, from casual practice to competitive tournaments.
		</p>
		<div class="modes-grid">
			{#each modes as mode, i}
				<div class="mode-card" data-index={i}>
					<div class="mode-icon">{mode.icon}</div>
					<div class="mode-name">{mode.name}</div>
					<div class="mode-desc">{mode.desc}</div>
					<div class="mode-players">{mode.players}</div>
				</div>
			{/each}
		</div>
	</section>

	<div class="divider"></div>

	<!-- Rules -->
	<section class="section">
		<h2 class="section-title"><span class="title-bar blue"></span> Rules</h2>
		<p class="section-sub">Simple rules, fast games.</p>
		<div class="rules-list">
			{#each rules as rule, i}
				<div class="rule">
					<div class="rule-num">{i + 1}</div>
					<div class="rule-text">{@html rule.text}</div>
				</div>
			{/each}
		</div>
	</section>

	<div class="divider"></div>

	<!-- Game Speeds -->
	<section class="section">
		<h2 class="section-title"><span class="title-bar gold"></span> Game Speeds</h2>
		<p class="section-sub">Choose your pace before each match.</p>
		<div class="speed-grid">
			{#each speeds as speed}
				<div class="speed-card">
					<div class="speed-emoji">{speed.emoji}</div>
					<div class="speed-name">{speed.name}</div>
					<div class="speed-desc">{speed.desc}</div>
				</div>
			{/each}
		</div>
	</section>

	<div class="divider"></div>

	<!-- Tips -->
	<section class="section">
		<h2 class="section-title"><span class="title-bar green"></span> Tips & Tricks</h2>
		<p class="section-sub">Get better faster.</p>
		<div class="tips-grid">
			{#each tips as tip}
				<div class="tip">
					<div class="tip-icon">{tip.icon}</div>
					<div class="tip-text">{@html tip.text}</div>
				</div>
			{/each}
		</div>
	</section>

	<div class="divider"></div>

	<!-- Progression & XP -->
	<section class="section">
		<h2 class="section-title"><span class="title-bar orange"></span>Progression & XP</h2>
		<div class="coming-soon-card">
			<div class="coming-soon-icon">🚀</div>
			<h3 class="coming-soon-title">Coming Soon</h3>
			<p class="coming-soon-desc">
				Earn XP for every match, level up your profile, and unlock achievements.
				The progression system is currently in development.
			</p>
		</div>
	</section>

	<!-- CTA -->
	<div class="inst-cta">
		<div class="cta-title">Ready to play?</div>
		<div class="cta-sub">
			Jump straight in — no account needed for local and AI games.
		</div>
		<a href="/play" class="btn-play">🎮 Play Now</a>
	</div>
</div>

<style>
	.instructions-page {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding: 3rem 1.5rem 4rem;
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
		font-size: 0.9rem;
		color: #ff6b9d;
		font-weight: 500;
	}

	.page-title {
		font-size: 2.8rem;
		font-weight: 900;
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

	/* ── Shared ── */
	.section {
		margin-bottom: 3.5rem;
	}

	.section-title {
		font-size: 1.45rem;
		font-weight: 700;
		color: #fff;
		margin: 0 0 0.35rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
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
	.title-bar.gold {
		background: #ffd700;
	}
	.title-bar.green {
		background: #4ade80;
	}
	.title-bar.orange {
		background: #f97316;
	}

	.section-sub {
		font-size: 0.95rem;
		color: #7a7a9e;
		margin-bottom: 1.5rem;
		line-height: 1.6;
	}

	.divider {
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.06),
			transparent
		);
		margin: 3rem 0;
	}

	/* ── Controls ── */
	.controls-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.control-card {
		padding: 1.25rem;
		border-radius: 0.85rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		transition: all 0.2s;
	}

	.control-card:hover {
		border-color: rgba(255, 255, 255, 0.1);
	}

	.control-label {
		font-size: 0.88rem;
		font-weight: 600;
		color: #fff;
		margin-bottom: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.tag {
		font-size: 0.75rem;
		padding: 0.1rem 0.4rem;
		border-radius: 1rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.tag.p1 {
		background: rgba(255, 107, 157, 0.12);
		color: #ff6b9d;
	}

	.tag.p2 {
		background: rgba(96, 165, 250, 0.12);
		color: #60a5fa;
	}

	.key-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.key-row:last-child {
		margin-bottom: 0;
	}

	.key {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 36px;
		height: 32px;
		padding: 0 0.5rem;
		border-radius: 0.35rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-bottom: 2px solid rgba(255, 255, 255, 0.12);
		color: #fff;
		font-size: 0.82rem;
		font-weight: 600;
		font-family: 'Courier New', monospace;
	}

	.key-desc {
		font-size: 0.72rem;
		color: #7a7a9e;
	}

	/* ── Game Modes ── */
	.modes-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.mode-card {
		padding: 1.25rem;
		border-radius: 0.85rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		transition: all 0.25s;
		position: relative;
		overflow: hidden;
	}

	.mode-card:hover {
		border-color: rgba(255, 255, 255, 0.1);
		transform: translateY(-2px);
	}

	.mode-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		opacity: 0.5;
	}

	.mode-card[data-index='0']::before {
		background: linear-gradient(
			90deg,
			transparent,
			#4ade80,
			transparent
		);
	}
	.mode-card[data-index='1']::before {
		background: linear-gradient(
			90deg,
			transparent,
			#60a5fa,
			transparent
		);
	}
	.mode-card[data-index='2']::before {
		background: linear-gradient(
			90deg,
			transparent,
			#a855f7,
			transparent
		);
	}
	.mode-card[data-index='3']::before {
		background: linear-gradient(
			90deg,
			transparent,
			#ffd700,
			transparent
		);
	}

	.mode-icon {
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.mode-name {
		font-size: 0.95rem;
		font-weight: 600;
		color: #fff;
		margin-bottom: 0.2rem;
	}

	.mode-desc {
		font-size: 0.82rem;
		color: #7a7a9e;
		line-height: 1.5;
	}

	.mode-players {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-top: 0.5rem;
		font-size: 0.62rem;
		color: #7a7a9e;
		padding: 0.15rem 0.5rem;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.04);
	}

	/* ── Rules ── */
	.rules-list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.rule {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		border-radius: 0.65rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
		transition: background 0.15s;
	}

	.rule:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.rule-num {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: rgba(96, 165, 250, 0.1);
		color: #60a5fa;
		font-size: 0.7rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border: 1px solid rgba(96, 165, 250, 0.15);
	}

	.rule-text {
		font-size: 0.9rem;
		color: #d1d5db;
		line-height: 1.55;
	}

	.rule-text :global(strong) {
		color: #fff;
		font-weight: 600;
	}

	/* ── Speed Cards ── */
	.speed-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	.speed-card {
		padding: 1rem;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		text-align: center;
		transition: all 0.2s;
	}

	.speed-card:hover {
		border-color: rgba(255, 255, 255, 0.1);
	}

	.speed-emoji {
		font-size: 1.45rem;
		margin-bottom: 0.3rem;
	}

	.speed-name {
		font-size: 0.88rem;
		font-weight: 600;
		color: #fff;
		margin-bottom: 0.15rem;
	}

	.speed-desc {
		font-size: 0.75rem;
		color: #7a7a9e;
		line-height: 1.4;
	}

	/* ── Tips ── */
	.tips-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.tip {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		padding: 1rem;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
	}

	.tip-icon {
		font-size: 1.2rem;
		flex-shrink: 0;
		margin-top: 0.05rem;
	}

	.tip-text {
		font-size: 0.88rem;
		color: #d1d5db;
		line-height: 1.5;
	}

	.tip-text :global(strong) {
		color: #fff;
		font-weight: 600;
	}

	.coming-soon-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px dashed rgba(255, 107, 157, 0.3);
		border-radius: 1rem;
		padding: 2rem;
		text-align: center;
		max-width: 500px;
		margin: 1.25rem auto 0;
	}

	.coming-soon-icon {
		font-size: 2.5rem;
		margin-bottom: 0.75rem;
	}

	.coming-soon-title {
		color: var(--accent);
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0 0 0.5rem;
	}

	.coming-soon-desc {
		color: #9ca3af;
		font-size: 0.85rem;
		line-height: 1.5;
		margin: 0;
	}

	/* ── CTA ── */
	.inst-cta {
		text-align: center;
		padding: 2.5rem 1.5rem;
		border-radius: 1rem;
		background: linear-gradient(
			135deg,
			rgba(168, 85, 247, 0.04),
			rgba(255, 107, 157, 0.03)
		);
		border: 1px solid rgba(255, 107, 157, 0.08);
	}

	.cta-title {
		font-size: 1.45rem;
		font-weight: 700;
		color: #fff;
		margin-bottom: 0.35rem;
	}

	.cta-sub {
		font-size: 0.92rem;
		color: #7a7a9e;
		margin-bottom: 1.25rem;
	}

	.btn-play {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.65rem 1.75rem;
		border-radius: 0.65rem;
		border: none;
		background: linear-gradient(135deg, #ff6b9d, #e84393);
		color: #fff;
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.25s;
		box-shadow: 0 4px 20px rgba(255, 107, 157, 0.3);
		text-decoration: none;
	}

	.btn-play:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 30px rgba(255, 107, 157, 0.4);
	}

	/* ── Responsive ── */
	@media (max-width: 768px) {
		.page-title {
			font-size: 1.75rem;
		}
		.controls-grid,
		.modes-grid,
		.tips-grid {
			grid-template-columns: 1fr;
		}
		.speed-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
