<script lang="ts">
	type Props = {
		onClose: () => void;
	};

	let { onClose }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" role="dialog" aria-modal="true" tabindex="-1" onclick={onClose}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		<!-- Animated border glow -->
		<div class="modal-glow"></div>
		<div class="modal-inner">

			<div class="modal-header">
				<div class="header-left">
					<div class="header-icon-wrap">
						<span class="header-icon">🏓</span>
						<span class="header-ring"></span>
					</div>
					<div>
						<h3 class="modal-title">Matchmaking</h3>
						<p class="modal-sub">How we find your opponent</p>
					</div>
				</div>
				<button class="close-btn" onclick={onClose} aria-label="Close">
					<svg width="16" height="16" viewBox="0 0 14 14" fill="none">
						<path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				</button>
			</div>

			<!-- PLAY MODES -->
			<div class="section">
				<h4 class="section-heading">Choose your style</h4>
				<div class="mode-cards">
					<div class="mode-card">
						<div class="mode-icon-bg random">
							<span class="mode-icon">🎲</span>
						</div>
						<div class="mode-text">
							<span class="mode-name">Random</span>
							<span class="mode-desc">Anyone, any settings. Instant queue.</span>
						</div>
					</div>
					<div class="mode-card">
						<div class="mode-icon-bg prefs">
							<span class="mode-icon">⚙️</span>
						</div>
						<div class="mode-text">
							<span class="mode-name">My Preferences</span>
							<span class="mode-desc">Your saved speed + score. Best match first.</span>
						</div>
					</div>
					<div class="mode-card">
						<div class="mode-icon-bg custom">
							<span class="mode-icon">🎯</span>
						</div>
						<div class="mode-text">
							<span class="mode-name">Custom</span>
							<span class="mode-desc">Pick your rules. Same smart matching.</span>
						</div>
					</div>
				</div>
			</div>

			<!-- SEARCH TIERS - visual timeline -->
			<div class="section">
				<h4 class="section-heading">Search expands over time</h4>
				<div class="timeline">
					<div class="timeline-track">
						<div class="track-fill exact"></div>
						<div class="track-fill flexible"></div>
						<div class="track-fill wide"></div>
					</div>
					<div class="timeline-items">
						<div class="timeline-item">
							<div class="timeline-dot exact"></div>
							<div class="timeline-content">
								<div class="timeline-top">
									<span class="timeline-label exact">Exact</span>
									<span class="timeline-time">0 – 45s</span>
								</div>
								<span class="timeline-desc">Identical settings only</span>
							</div>
						</div>
						<div class="timeline-item">
							<div class="timeline-dot flexible"></div>
							<div class="timeline-content">
								<div class="timeline-top">
									<span class="timeline-label flexible">Expanding</span>
									<span class="timeline-time">45 – 90s</span>
								</div>
								<span class="timeline-desc">Same speed, close score</span>
							</div>
						</div>
						<div class="timeline-item">
							<div class="timeline-dot wide"></div>
							<div class="timeline-content">
								<div class="timeline-top">
									<span class="timeline-label wide">Wide</span>
									<span class="timeline-time">90s+</span>
								</div>
								<span class="timeline-desc">Anyone — closest settings win</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- TIPS -->
			<div class="section">
				<h4 class="section-heading">Tips</h4>
				<div class="tips-grid">
					<div class="tip">
						<span class="tip-icon">🎯</span>
						<span class="tip-text">Always picks <strong>closest match</strong>, not first</span>
					</div>
					<div class="tip">
						<span class="tip-icon">⏳</span>
						<span class="tip-text"><strong>Longer wait = priority</strong> on settings</span>
					</div>
					<div class="tip">
						<span class="tip-icon">🤖</span>
						<span class="tip-text">Play <strong>vs computer</strong> while queued</span>
					</div>
					<div class="tip">
						<span class="tip-icon">⏰</span>
						<span class="tip-text">Queue expires after <strong>5 minutes</strong></span>
					</div>
				</div>
			</div>

			<button class="got-it-btn" onclick={onClose}>
				<span class="got-it-text">Got it</span>
			</button>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.modal {
		position: relative;
		max-width: 540px;
		width: 100%;
		max-height: 85vh;
		border-radius: 1rem;
		overflow: hidden;
		animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.modal-glow {
		position: absolute;
		inset: 0;
		border-radius: 1rem;
		padding: 1.5px;
		background: linear-gradient(
			135deg,
			rgba(255, 107, 157, 0.4),
			rgba(168, 85, 247, 0.3),
			rgba(96, 165, 250, 0.3),
			rgba(255, 107, 157, 0.4)
		);
		background-size: 300% 300%;
		animation: border-flow 4s ease infinite;
		-webkit-mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
	}

	.modal-inner {
		position: relative;
		background: linear-gradient(170deg, #1a1a2e 0%, #12121f 100%);
		border-radius: 1rem;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		max-height: 85vh;
		overflow-y: auto;
	}

	@keyframes modal-in {
		from { transform: scale(0.9) translateY(10px); opacity: 0; }
		to { transform: scale(1) translateY(0); opacity: 1; }
	}

	@keyframes border-flow {
		0% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
		100% { background-position: 0% 50%; }
	}

	/* ── Header ────────────────────────────────── */
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.header-icon-wrap {
		position: relative;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.header-icon {
		font-size: 1.4rem;
		position: relative;
		z-index: 1;
	}

	.header-ring {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		border: 2px solid rgba(255, 107, 157, 0.25);
		animation: ring-pulse 2.5s ease-out infinite;
	}

	@keyframes ring-pulse {
		0% { transform: scale(0.8); opacity: 0.6; }
		100% { transform: scale(1.3); opacity: 0; }
	}

	.modal-title {
		font-size: 1.05rem;
		font-weight: 700;
		color: #f3f4f6;
		margin: 0;
	}

	.modal-sub {
		font-size: 0.7rem;
		color: #6b7280;
		margin: 0.1rem 0 0;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(255, 255, 255, 0.04);
		color: #6b7280;
		cursor: pointer;
		transition: all 0.15s;
		padding: 0;
	}

	.close-btn:hover {
		border-color: rgba(255, 255, 255, 0.15);
		color: #d1d5db;
	}

	/* ── Sections ──────────────────────────────── */
	.section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.section-heading {
		font-size: 0.7rem;
		font-weight: 700;
		color: #ff6b9d;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 0;
	}

	/* ── Mode Cards ────────────────────────────── */
	.mode-cards {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.mode-card {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.55rem 0.65rem;
		border-radius: 0.6rem;
		background: rgba(255, 255, 255, 0.025);
		border: 1px solid rgba(255, 255, 255, 0.04);
		transition: border-color 0.2s;
	}

	.mode-card:hover {
		border-color: rgba(255, 255, 255, 0.08);
	}

	.mode-icon-bg {
		width: 36px;
		height: 36px;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.mode-icon-bg.random { background: rgba(168, 85, 247, 0.12); }
	.mode-icon-bg.prefs { background: rgba(96, 165, 250, 0.12); }
	.mode-icon-bg.custom { background: rgba(255, 107, 157, 0.12); }

	.mode-icon { font-size: 1.1rem; }

	.mode-text {
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
	}

	.mode-name {
		font-size: 0.8rem;
		font-weight: 600;
		color: #e5e7eb;
	}

	.mode-desc {
		font-size: 0.68rem;
		color: #6b7280;
		line-height: 1.3;
	}

	/* ── Timeline ──────────────────────────────── */
	.timeline {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.timeline-track {
		display: flex;
		height: 4px;
		border-radius: 2px;
		overflow: hidden;
		gap: 2px;
	}

	.track-fill {
		height: 100%;
		border-radius: 2px;
		animation: track-grow 0.6s ease-out both;
	}

	.track-fill.exact {
		flex: 45;
		background: linear-gradient(90deg, #ff6b9d, #ff85b1);
		animation-delay: 0.1s;
	}

	.track-fill.flexible {
		flex: 45;
		background: linear-gradient(90deg, #facc15, #fde047);
		animation-delay: 0.25s;
	}

	.track-fill.wide {
		flex: 30;
		background: linear-gradient(90deg, #f87171, #fca5a5);
		animation-delay: 0.4s;
	}

	@keyframes track-grow {
		from { transform: scaleX(0); transform-origin: left; }
		to { transform: scaleX(1); transform-origin: left; }
	}

	.timeline-items {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.timeline-item {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.4rem 0.5rem;
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.03);
	}

	.timeline-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow: 0 0 8px;
	}

	.timeline-dot.exact {
		background: #ff6b9d;
		box-shadow: 0 0 8px rgba(255, 107, 157, 0.4);
	}

	.timeline-dot.flexible {
		background: #facc15;
		box-shadow: 0 0 8px rgba(250, 204, 21, 0.4);
	}

	.timeline-dot.wide {
		background: #f87171;
		box-shadow: 0 0 8px rgba(248, 113, 113, 0.4);
	}

	.timeline-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
	}

	.timeline-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.timeline-label {
		font-size: 0.78rem;
		font-weight: 700;
	}

	.timeline-label.exact { color: #ff6b9d; }
	.timeline-label.flexible { color: #facc15; }
	.timeline-label.wide { color: #f87171; }

	.timeline-time {
		font-size: 0.65rem;
		color: #4b5563;
		font-variant-numeric: tabular-nums;
	}

	.timeline-desc {
		font-size: 0.68rem;
		color: #6b7280;
	}

	/* ── Tips Grid ─────────────────────────────── */
	.tips-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.35rem;
	}

	.tip {
		display: flex;
		align-items: flex-start;
		gap: 0.4rem;
		padding: 0.45rem 0.5rem;
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.03);
	}

	.tip-icon {
		font-size: 0.85rem;
		flex-shrink: 0;
		margin-top: 0.02rem;
	}

	.tip-text {
		font-size: 0.68rem;
		color: #9ca3af;
		line-height: 1.35;
	}

	.tip-text strong {
		color: #d1d5db;
		font-weight: 600;
	}

	/* ── Got It Button ─────────────────────────── */
	.got-it-btn {
		width: 100%;
		padding: 0.65rem;
		border-radius: 0.6rem;
		border: none;
		background: linear-gradient(135deg, #ff6b9d, #a855f7);
		color: #fff;
		font-size: 0.85rem;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.2s;
		position: relative;
		overflow: hidden;
	}

	.got-it-btn::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.15) 50%, transparent 70%);
		background-size: 200% 100%;
		animation: shimmer 2s ease-in-out infinite;
	}

	.got-it-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 15px rgba(255, 107, 157, 0.3);
	}

	.got-it-text {
		position: relative;
		z-index: 1;
	}

	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* ── Scrollbar ─────────────────────────────── */
	.modal-inner::-webkit-scrollbar {
		width: 4px;
	}

	.modal-inner::-webkit-scrollbar-track {
		background: transparent;
	}

	.modal-inner::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.08);
		border-radius: 2px;
	}

	/* ── Responsive ────────────────────────────── */
	@media (max-width: 400px) {
		.tips-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
