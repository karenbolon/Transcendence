<script lang="ts">
	type Props = {
		searchTime: number;
		queuePosition: number;
		playersOnline: number;
		settings?: { mode: string; speedPreset: string; winScore: number } | null;
		onCancel: () => void;
	};

	let { searchTime, queuePosition, playersOnline, settings = null, onCancel }: Props = $props();

	// Matching tier based on search time (mirrors server: 45s flexible, 90s desperate)
	let tier = $derived<'exact' | 'flexible' | 'desperate'>(
		searchTime >= 90 ? 'desperate' : searchTime >= 45 ? 'flexible' : 'exact'
	);

	let tierLabel = $derived(
		tier === 'desperate' ? 'Wide search — matching anyone'
		: tier === 'flexible' ? 'Expanding — relaxing settings'
		: 'Exact match'
	);

	function settingsLabel(s: { mode: string; speedPreset: string; winScore: number }): string {
		if (s.mode === 'random') return 'Random';
		const speed = s.speedPreset.charAt(0).toUpperCase() + s.speedPreset.slice(1);
		return `${speed} · First to ${s.winScore}`;
	}
</script>

<div class="queue-pill">
	<div class="pill-glow" class:flexible={tier === 'flexible'} class:desperate={tier === 'desperate'}></div>
	<div class="pill-content">
		<div class="pill-left">
			<div class="radar">
				<span class="radar-ring"></span>
				<span class="radar-dot"></span>
			</div>
			<div class="pill-labels">
				<span class="pill-label">Searching for match</span>
				<span class="pill-tier" class:flexible={tier === 'flexible'} class:desperate={tier === 'desperate'}>{tierLabel}</span>
			</div>
		</div>
		<div class="pill-right">
			<div class="pill-stats">
				<div class="stat">
					<span class="stat-value">{Math.floor(searchTime / 60)}:{String(searchTime % 60).padStart(2, '0')}</span>
					<span class="stat-label">Time</span>
				</div>
				<span class="stat-divider"></span>
				<div class="stat">
					<span class="stat-value">#{queuePosition}</span>
					<span class="stat-label">Position</span>
				</div>
				<span class="stat-divider"></span>
				<div class="stat">
					<span class="stat-value">{playersOnline}</span>
					<span class="stat-label">Online</span>
				</div>
				{#if settings}
					<span class="stat-divider"></span>
					<div class="stat">
						<span class="stat-value">{settingsLabel(settings)}</span>
						<span class="stat-label">Mode</span>
					</div>
				{/if}
			</div>
			<button class="pill-cancel" onclick={onCancel} aria-label="Cancel search">
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
					<path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</button>
		</div>
	</div>
</div>

<style>
	.queue-pill {
		position: relative;
		width: 100%;
		max-width: 900px;
		border-radius: 1rem;
		overflow: hidden;
	}

	/* Animated gradient border glow */
	.pill-glow {
		position: absolute;
		inset: 0;
		border-radius: 1rem;
		padding: 1px;
		background: linear-gradient(
			90deg,
			rgba(255, 107, 157, 0.05),
			rgba(255, 107, 157, 0.35),
			rgba(168, 85, 247, 0.25),
			rgba(255, 107, 157, 0.05)
		);
		background-size: 300% 100%;
		animation: glow-sweep 3s ease-in-out infinite;
		-webkit-mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
		transition: background 0.5s;
	}

	.pill-glow.flexible {
		background: linear-gradient(
			90deg,
			rgba(250, 204, 21, 0.05),
			rgba(250, 204, 21, 0.35),
			rgba(255, 107, 157, 0.25),
			rgba(250, 204, 21, 0.05)
		);
		background-size: 300% 100%;
		animation: glow-sweep 2s ease-in-out infinite;
	}

	.pill-glow.desperate {
		background: linear-gradient(
			90deg,
			rgba(248, 113, 113, 0.05),
			rgba(248, 113, 113, 0.4),
			rgba(168, 85, 247, 0.3),
			rgba(248, 113, 113, 0.05)
		);
		background-size: 300% 100%;
		animation: glow-sweep 1.5s ease-in-out infinite;
	}

	.pill-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 0.85rem 0.75rem 1rem;
		border-radius: 1rem;
		background: rgba(255, 107, 157, 0.04);
		backdrop-filter: blur(8px);
	}

	.pill-left {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.pill-labels {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.pill-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	/* Radar animation */
	.radar {
		position: relative;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.radar-ring {
		position: absolute;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		border: 1.5px solid rgba(255, 107, 157, 0.3);
		animation: radar-pulse 2s ease-out infinite;
	}

	.radar-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #ff6b9d;
		box-shadow: 0 0 6px rgba(255, 107, 157, 0.5);
	}

	.pill-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: #ff6b9d;
		letter-spacing: 0.01em;
		line-height: 1.2;
	}

	.pill-tier {
		font-size: 0.7rem;
		color: #6b7280;
		line-height: 1.3;
		transition: color 0.3s;
	}

	.pill-tier.flexible {
		color: #facc15;
	}

	.pill-tier.desperate {
		color: #f87171;
	}

	.pill-stats {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.05rem;
	}

	.stat-value {
		font-size: 0.8rem;
		font-weight: 700;
		color: #e5e7eb;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.stat-label {
		font-size: 0.55rem;
		color: #4b5563;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-divider {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		align-self: center;
	}

	.pill-cancel {
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
		flex-shrink: 0;
		padding: 0;
	}

	.pill-cancel:hover {
		border-color: rgba(248, 113, 113, 0.3);
		background: rgba(248, 113, 113, 0.08);
		color: #f87171;
	}

	@keyframes glow-sweep {
		0% { background-position: 100% 0; }
		50% { background-position: 0% 0; }
		100% { background-position: 100% 0; }
	}

	@keyframes radar-pulse {
		0% { transform: scale(0.5); opacity: 0.8; }
		100% { transform: scale(1.4); opacity: 0; }
	}

	@media (max-width: 600px) {
		.pill-content {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
			padding: 0.65rem 0.75rem;
		}

		.pill-left {
			justify-content: flex-start;
		}

		.pill-right {
			justify-content: space-between;
		}

		.pill-stats {
			flex: 1;
			justify-content: space-around;
		}
	}

	@media (max-width: 400px) {
		.stat-label {
			display: none;
		}
	}
</style>
