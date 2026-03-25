<script lang="ts">
	import { speedEmoji } from '$lib/utils/format_game';
	import { capitalize } from '$lib/utils/format_progression';
	import { formatDuration } from '$lib/utils/format_date';
	import UserAvatar from '$lib/component/common/UserAvatar.svelte';

	type PlayerResult = {
		username: string;
		displayName: string | null;
		avatarUrl: string | null;
		score: number;
	};

	type GameOverData = {
		winner: 'player1' | 'player2';
		player1: PlayerResult;
		player2: PlayerResult;
		stats: {
			durationSeconds: number;
			speedPreset: string;
			winScore: number;
		};
		newBadges: { emoji: string; name: string }[];
	};

	type Props = {
		gameOverData: GameOverData;
		gameMode: 'local' | 'computer' | 'online' | 'tournament';
		onRematch: () => void;
		onBackToMenu: () => void;
	};

	let { gameOverData, gameMode, onRematch, onBackToMenu }: Props = $props();

	function handleRematch() {
		onRematch();
	}

	function handleBackToMenu() {
		onBackToMenu();
	}
</script>


<!-- ═══════════════════════════════════════════════
		RESULT PAGE — replaces everything
═══════════════════════════════════════════════ -->
<div class="result-page">
	<!-- Result header -->
	<div
		class="result-label"
		class:win={gameOverData.winner === 'player1' || gameMode === 'local'}
		class:loss={gameOverData.winner !== 'player1' && gameMode !== 'local'}
	>
		{gameMode === 'local' ? 'GAME OVER' : gameOverData.winner === 'player1' ? 'VICTORY' : 'DEFEAT'}
	</div>
	<h1 class="result-text">
		{gameMode === 'local'
			? `${gameOverData.winner === 'player1' ? (gameOverData.player1.displayName ?? gameOverData.player1.username) : (gameOverData.player2.displayName ?? gameOverData.player2.username)} Wins!`
			: gameOverData.winner === 'player1' ? 'You Won!' : 'Better luck next time!'}
	</h1>

	<!-- VS Layout -->
	<div class="vs-layout">
		<div class="player">
			<div class="player-avatar">
				<UserAvatar avatarUrl={gameOverData.player1.avatarUrl} username={gameOverData.player1.username} displayName={gameOverData.player1.displayName} size="xxl" />
			</div>
			<span class="player-name">{gameOverData.player1.displayName ?? gameOverData.player1.username}</span>
			<span class="player-score" class:winner={gameOverData.winner === 'player1'} class:loser={gameOverData.winner !== 'player1'}>
				{gameOverData.player1.score}
			</span>
			{#if gameOverData.winner === 'player1'}
				<span class="player-tag">Winner</span>
			{/if}
		</div>

		<div class="vs-divider">
			<div class="vs-line"></div>
			<span class="vs-text">VS</span>
			<div class="vs-line"></div>
		</div>

		<div class="player">
			<div class="player-avatar p2">
				<UserAvatar avatarUrl={gameOverData.player2.avatarUrl} username={gameOverData.player2.username} displayName={gameOverData.player2.displayName} size="xxl" />
			</div>
			<span class="player-name">{gameOverData.player2.displayName ?? gameOverData.player2.username}</span>
			<span class="player-score" class:winner={gameOverData.winner === 'player2'} class:loser={gameOverData.winner !== 'player2'}>
				{gameOverData.player2.score}
			</span>
			{#if gameOverData.winner === 'player2'}
				<span class="player-tag">Winner</span>
			{/if}
		</div>
	</div>

	<!-- Stats -->
	<div class="stats-row">
		<div class="stat">
			<span class="stat-value">{formatDuration(gameOverData.stats.durationSeconds)}</span>
			<span class="stat-label">Duration</span>
		</div>
		<div class="stat">
			<span class="stat-value">{speedEmoji(gameOverData.stats.speedPreset)} {capitalize(gameOverData.stats.speedPreset)}</span>
			<span class="stat-label">Speed</span>
		</div>
		<div class="stat">
			<span class="stat-value">{gameOverData.stats.winScore}</span>
			<span class="stat-label">Win Score</span>
		</div>
	</div>

	<!-- Badges -->
	{#if gameOverData.newBadges.length > 0}
		<div class="badges">
			{#each gameOverData.newBadges as badge, i}
				<div class="badge" style="animation-delay: {i * 0.15}s">
					<span class="badge-emoji">{badge.emoji}</span>
					<span class="badge-name">{badge.name}</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Actions -->
	<div class="actions">
		<button class="btn btn-rematch" onclick={handleRematch}>
			🔄 Rematch
		</button>
		<button class="btn btn-menu" onclick={handleBackToMenu}>
			← Go back
		</button>
	</div>
</div>

<style>

	/* ═════════════════════════════════════════════════
	   RESULT PAGE
	   ═════════════════════════════════════════════════ */
	.result-page {
		max-width: 600px;
		margin: 0 auto;
		padding: 9rem 3.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		animation: page-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.result-label {
		font-size: 0.95rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		margin-bottom: 0.45rem;
	}

	.result-label.win { color: #4ade80; }
	.result-label.loss { color: #f87171; }

	.result-text {
		font-size: 1.5rem;
		font-weight: 800;
		color: #f3f4f6;
		margin: 0 0 2rem 0;
	}

	/* ── VS LAYOUT ────────────────────────────── */
	.vs-layout {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 3rem;
		margin-bottom: 2rem;
		width: 100%;
	}

	.player {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		min-width: 100px;
	}

	.player-avatar {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ff6b9d, #c084fc);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.player-avatar.p2 {
		background: linear-gradient(135deg, #c084fc, #6366f1);
	}

	.player-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: #d1d5db;
	}

	.player-score {
		font-size: 2.5rem;
		font-weight: 800;
		line-height: 1;
	}

	.player-score.winner { color: #4ade80; }
	.player-score.loser { color: #f87171; opacity: 0.5; }

	.player-tag {
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		background: rgba(74, 222, 128, 0.12);
		color: #4ade80;
	}

	.vs-divider {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		color: #4b5563;
	}

	.vs-text {
		font-size: 0.85rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.vs-line {
		width: 1px;
		height: 24px;
		background: rgba(255, 255, 255, 0.06);
	}

	/* ── STATS ────────────────────────────────── */
	.stats-row {
		display: flex;
		justify-content: center;
		gap: 2rem;
		margin-bottom: 1.5rem;
		padding: 0.85rem 1.5rem;
		border-radius: 0.65rem;
		background: rgba(255, 255, 255, 0.025);
		border: 1px solid rgba(255, 255, 255, 0.04);
		width: 100%;
		max-width: 380px;
	}

	.stat { text-align: center; }

	.stat-value {
		display: block;
		font-size: 0.95rem;
		font-weight: 700;
		color: #d1d5db;
	}

	.stat-label {
		display: block;
		font-size: 0.6rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-top: 0.1rem;
	}

	/* ── BADGES ───────────────────────────────── */
	.badges {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.4rem;
		margin-bottom: 1.5rem;
	}

	.badge {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.75rem;
		background: rgba(251, 191, 36, 0.08);
		border: 1px solid rgba(251, 191, 36, 0.2);
		border-radius: 999px;
		animation: badge-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.badge-emoji { font-size: 0.9rem; }
	.badge-name { font-size: 0.75rem; font-weight: 600; color: #fbbf24; }

	/* ── ACTIONS ──────────────────────────────── */
	.actions {
		display: flex;
		gap: 0.6rem;
		width: 100%;
		max-width: 380px;
	}

	.btn {
		flex: 1;
		padding: 0.75rem;
		border-radius: 0.6rem;
		font-size: 0.9rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
	}

	.btn:hover { transform: scale(1.02); }

	.btn-rematch {
		background: #ff6b9d;
		color: #fff;
		border: none;
	}

	.btn-rematch:hover { background: #ff85b1; }

	.btn-menu {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: #9ca3af;
	}

	.btn-menu:hover {
		border-color: rgba(255, 255, 255, 0.15);
		color: #d1d5db;
	}

	/* ── ANIMATIONS ──────────────────────────── */
	@keyframes page-in {
		from { opacity: 0; transform: translateY(20px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes badge-pop {
		from { opacity: 0; transform: scale(0.5); }
		to { opacity: 1; transform: scale(1); }
	}

	@media (max-width: 500px) {
		.vs-layout { gap: 1rem; }
		.player { min-width: 80px; }
		.player-avatar { width: 56px; height: 56px; }
		.player-score { font-size: 2rem; }
		.stats-row { gap: 1.25rem; padding: 0.75rem 1rem; }
	}
</style>
