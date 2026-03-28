<script lang="ts">
</script>

<div class="quick-section">
	<div class="quick-header">
		<h2 class="quick-title">Quick Play</h2>
	</div>
	<div class="quick-grid">
		<a href="/play?mode=online" class="quick-card">
			<span class="quick-icon">🌐</span>
			<span class="quick-name">Find Match</span>
			<span class="quick-desc">Queue for an online match</span>
		</a>
		<a href="/play?mode=local" class="quick-card">
			<span class="quick-icon">👥</span>
			<span class="quick-name">Local 1v1</span>
			<span class="quick-desc">Play on the same keyboard</span>
		</a>
		<a href="/play?mode=computer" class="quick-card">
			<span class="quick-icon">🤖</span>
			<span class="quick-name">vs Computer</span>
			<span class="quick-desc">Practice against the AI</span>
		</a>
	</div>
</div>

<style>
	/* QUICK PLAY */
	.quick-header {
		margin-bottom: 0.75rem;
	}

	.quick-title {
		font-size: 1.05rem;
		font-weight: 600;
		color: #d1d5db;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
	}

	.quick-title::before {
		content: '';
		width: 3px;
		height: 14px;
		border-radius: 2px;
		background: #4ade80;
	}

	.quick-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	.quick-card {
		background: linear-gradient(
			135deg,
			rgba(22, 22, 58, 0.8),
			rgba(16, 16, 42, 0.9)
		);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.85rem;
		padding: 1.25rem;
		text-align: center;
		text-decoration: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.25s;
		position: relative;
		overflow: hidden;
	}

	.quick-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		opacity: 0;
		transition: opacity 0.25s;
	}

	.quick-card:hover {
		border-color: rgba(255, 107, 157, 0.2);
		transform: translateY(-3px);
	}

	.quick-card:hover::before {
		opacity: 0.5;
	}

	.quick-card:nth-child(1)::before {
		background: linear-gradient(90deg, transparent, #a855f7, transparent);
	}
	.quick-card:nth-child(2)::before {
		background: linear-gradient(90deg, transparent, #4ade80, transparent);
	}
	.quick-card:nth-child(3)::before {
		background: linear-gradient(90deg, transparent, #60a5fa, transparent);
	}

	.quick-icon {
		font-size: 1.75rem;
	}
	.quick-name {
		color: #d1d5db;
		font-size: 0.92rem;
		font-weight: 600;
	}
	.quick-desc {
		color: #7a7a9e;
		font-size: 0.68rem;
		line-height: 1.4;
	}

	@media (max-width: 768px) {
		.quick-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
