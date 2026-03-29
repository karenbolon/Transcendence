<script lang="ts">
	import type { GameMode } from '$lib/game/gameEngine';

	type Props = {
		gameMode: GameMode;
		/** Shown when gameMode is computer (e.g. Homer / Bart / Lisa). */
		computerOpponentName?: string;
	};

	let { gameMode, computerOpponentName = 'Computer' }: Props = $props();
</script>

<div class="controls-hint">
	<div class="control-group">
		<span class="control-label">Player 1</span>
		<div class="keys">
			<kbd>W</kbd> <span>Up</span>
			<kbd>S</kbd> <span>Down</span>
		</div>
	</div>
	{#if gameMode === 'local'}
		<div class="control-group">
			<span class="control-label">Player 2</span>
			<div class="keys">
				<kbd>↑</kbd> <span>Up</span>
				<kbd>↓</kbd> <span>Down</span>
			</div>
		</div>
	{:else}
		<div class="control-group">
			<span class="control-label computer-label">🤖 {computerOpponentName}</span>
		</div>
	{/if}
</div>

<style>
	.controls-hint {
		display: flex;
		gap: 4rem;
	}

	.control-group {
		text-align: center;
	}

	.control-label {
		display: block;
		color: #9ca3af;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: 0.4rem;
	}

	.keys {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: #6b7280;
		font-size: 0.8rem;
	}

	kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.5rem;
		padding: 0.15rem 0.4rem;
		border-radius: 0.3rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-bottom-width: 2px;
		color: #d1d5db;
		font-family: inherit;
		font-size: 0.75rem;
		font-weight: 600;
	}
</style>