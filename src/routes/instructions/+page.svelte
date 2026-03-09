<script lang="ts">
	import { _ } from 'svelte-i18n';

	const modes = [
		{
			icon: '🤝',
			name: _('instructions.modes.local.name'),
			desc: _('instructions.modes.local.desc'),
			players: _('instructions.modes.local.players'),
		},
		{
			icon: '🤖',
			name: _('instructions.modes.ai.name'),
			desc: _('instructions.modes.ai.desc'),
			players: _('instructions.modes.ai.players'),
		},
		{
			icon: '🌐',
			name: _('instructions.modes.online.name'),
			desc: _('instructions.modes.online.desc'),
			players: _('instructions.modes.online.players'),
		},
		{
			icon: '🏟️',
			name: _('instructions.modes.tournament.name'),
			desc: _('instructions.modes.tournament.desc'),
			players: _('instructions.modes.tournament.players'),
		},
	];

	const rules = [
		{
			title: _('instructions.rules.score_to_win.title'),
			body: _('instructions.rules.score_to_win.body'),
		},
		{
			title: _('instructions.rules.first_to_target.title'),
			body: _('instructions.rules.first_to_target.body'),
		},
		{
			title: _('instructions.rules.ball_speeds_up.title'),
			body: _('instructions.rules.ball_speeds_up.body'),
		},
		{
			title: _('instructions.rules.angle_control.title'),
			body: _('instructions.rules.angle_control.body'),
		},
		{
			title: _('instructions.rules.no_pause_online.title'),
			body: _('instructions.rules.no_pause_online.body'),
		},
	];

	const speeds = [
		{
			emoji: '🐢',
			name: _('instructions.speeds.chill.title'),
			desc: _('instructions.speeds.chill.body'),
		},
		{
			emoji: '🏓',
			name: _('instructions.speeds.normal.title'),
			desc: _('instructions.speeds.normal.body'),
		},
		{
			emoji: '🔥',
			name: _('instructions.speeds.fast.title'),
			desc: _('instructions.speeds.fast.body'),
		},
	];

	const tips = [
		{
			icon: '🎯',
			title: _('instructions.tips.edges.title'),
			body: _('instructions.tips.edges.body'),
		},
		{
			icon: '🧠',
			title: _('instructions.tips.anticipate.title'),
			body: _('instructions.tips.anticipate.body'),
		},
		{
			icon: '🏃',
			title: _('instructions.tips.center.title'),
			body: _('instructions.tips.center.body'),
		},
		{
			icon: '💪',
			title: _('instructions.tips.practice.title'),
			body: _('instructions.tips.practice.body'),
		},
	];
</script>

<div class="instructions-page">
	<!-- Header -->
	<div class="page-header">
		<div class="page-tag">📖 {_('instructions.header.tag')}</div>
		<h1 class="page-title">
			{_('instructions.header.title_prefix')} <span class="glow-text">{_('instructions.header.title_highlight')}</span>
		</h1>
		<p class="page-sub">
			{_('instructions.header.subtitle')}
		</p>
	</div>

	<!-- Controls -->
	<section class="section">
		<h2 class="section-title"><span class="title-bar accent"></span> {_('instructions.controls.title')}</h2>
		<p class="section-sub">
			{_('instructions.controls.subtitle')}
		</p>
		<div class="controls-grid">
			<div class="control-card">
				<div class="control-label">
					<span class="tag p1">{_('instructions.controls.player1.tag')}</span> {_('instructions.controls.player1.side')}
				</div>
				<div class="key-row">
					<kbd class="key">W</kbd>
					<span class="key-desc">{_('instructions.controls.move_up')}</span>
				</div>
				<div class="key-row">
					<kbd class="key">S</kbd>
					<span class="key-desc">{_('instructions.controls.move_down')}</span>
				</div>
			</div>
			<div class="control-card">
				<div class="control-label">
					<span class="tag p2">{_('instructions.controls.player2.tag')}</span> {_('instructions.controls.player2.side')}
				</div>
				<div class="key-row">
					<kbd class="key">↑</kbd>
					<span class="key-desc">{_('instructions.controls.move_up')}</span>
				</div>
				<div class="key-row">
					<kbd class="key">↓</kbd>
					<span class="key-desc">{_('instructions.controls.move_down')}</span>
				</div>
			</div>
		</div>
	</section>

	<div class="divider"></div>

	<!-- Game Modes -->
	<section class="section">
		<h2 class="section-title"><span class="title-bar purple"></span> {_('instructions.modes.title')}</h2>
		<p class="section-sub">
			{_('instructions.modes.subtitle')}
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
		<h2 class="section-title"><span class="title-bar blue"></span> {_('instructions.rules.title')}</h2>
		<p class="section-sub">{_('instructions.rules.subtitle')}</p>
		<div class="rules-list">
			{#each rules as rule, i}
				<div class="rule">
					<div class="rule-num">{i + 1}</div>
					<div class="rule-text">
						<strong>{rule.title}</strong> {rule.body}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<div class="divider"></div>

	<!-- Game Speeds -->
	<section class="section">
		<h2 class="section-title"><span class="title-bar gold"></span> {_('instructions.game_speeds.title')}</h2>
		<p class="section-sub">{_('instructions.game_speeds.body')}</p>
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
		<h2 class="section-title"><span class="title-bar green"></span> {_('instructions.tips.edges.title')}</h2>
		<p class="section-sub">{_('instructions.tipa.edges.subtitle')}</p>
		<div class="tips-grid">
			{#each tips as tip}
				<div class="tip">
					<div class="tip-icon">{tip.icon}</div>
					<div class="tip-text"><strong>{tip.title}</strong> {tip.body}</div>
				</div>
			{/each}
		</div>
	</section>

	<div class="divider"></div>

	<!-- Progression & XP -->
	<section class="section">
		<h2 class="section-title"><span class="title-bar orange"></span>{_('instructions.progression.title')}</h2>
		<div class="coming-soon-card">
			<div class="coming-soon-icon">🚀</div>
			<h3 class="coming-soon-title">{_('instructions.progression.subtitle')}</h3>
			<p class="coming-soon-desc">
				{_('instructions.progression.desc')}
			</p>
		</div>
	</section>

	<!-- CTA -->
	<div class="inst-cta">
		<div class="cta-title">{_('instructions.play.title')}</div>
		<div class="cta-sub">
			{_('instructions.play.subtitle')}
		</div>
		<a href="/play" class="btn-play">{_('instructions.play.desc')}</a>
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
