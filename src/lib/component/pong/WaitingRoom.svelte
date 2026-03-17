<script lang="ts">
	import { speedEmoji } from '$lib/utils/format_game';
	import { capitalize } from '$lib/utils/format_progression';
	import UserAvatar from '../UserAvatar.svelte';

	type LobbyState = 'waiting' | 'connecting' | 'declined' | 'expired';
	type SpeedOption = 'chill' | 'normal' | 'fast';

	type Props = {
		lobbyState: LobbyState;
		you: { username: string; avatarUrl: string | null; displayName: string | null };
		opponent: { username: string; avatarUrl: string | null; displayName: string | null };
		settings: { speedPreset: SpeedOption; winScore: number; mode: string };
		timeLeft: number;
		totalTime: number;
		onCancel: () => void;
	};

	let { lobbyState, you, opponent, settings, timeLeft, totalTime, onCancel }: Props = $props();

	let progress = $derived((timeLeft / totalTime) * 100);
	let isUrgent = $derived(timeLeft <= 10);

	function timerDisplay() {
		return `0:${String(timeLeft).padStart(2, '0')}`;
	}

	const scoreLabels: Record<number, string> = { 3: 'Quick', 5: 'Standard', 7: 'Long', 11: 'Marathon' };
	const modeLabels: Record<string, string> = { online: '1v1', tournament: 'Tournament' };
</script>

<div class="lobby">
	<!-- Mini pong animation -->
	<div class="pong-mini">
		<div class="pong-paddle left"></div>
		<div class="pong-paddle right" class:dimmed={lobbyState !== 'connecting'}></div>
		<div class="pong-center-line"></div>
		<div class="pong-ball" class:paused={lobbyState !== 'waiting'}></div>
	</div>

	<!-- Status label -->
	<div class="status-area">
		{#if lobbyState === 'waiting'}
			<div class="status-label">Waiting for opponent</div>
			<div class="status-dots">
				<span class="status-text">Connecting</span>
				<span class="dot"></span>
				<span class="dot d2"></span>
				<span class="dot d3"></span>
			</div>
		{:else if lobbyState === 'connecting'}
			<div class="status-label connecting">Opponent accepted!</div>
			<div class="status-text-single">Setting up the game...</div>
		{:else if lobbyState === 'declined'}
			<div class="status-label declined">Challenge declined</div>
			<div class="status-text-single">{opponent.username} isn't available right now</div>
		{:else if lobbyState === 'expired'}
			<div class="status-label expired">Challenge expired</div>
			<div class="status-text-single">{opponent.username} didn't respond in time</div>
		{/if}
	</div>

	<!-- VS Layout -->
	<div class="vs-layout">
		<!-- You -->
		<div class="player">
			<div class="avatar-wrapper">
				<div class="avatar you-avatar">
					<UserAvatar avatarUrl={you.avatarUrl} username={you.username} displayName={you.displayName} size="xl"/>
				</div>
			</div>
			<span class="player-name">You</span>
			<span class="player-badge ready">Ready</span>
		</div>

		<!-- VS -->
		<div class="vs-divider">
			<div class="vs-line"></div>
			<span class="vs-text">VS</span>
			<div class="vs-line"></div>
		</div>

		<!-- Opponent -->
		<div class="player">
			<div class="avatar-wrapper">
				{#if lobbyState === 'connecting'}
					<div class="avatar opponent-avatar connected">
						<UserAvatar avatarUrl={opponent.avatarUrl} username={opponent.username} displayName={opponent.displayName} size="xl"/>
					</div>
				{:else}
					<div class="avatar opponent-placeholder" class:error-state={lobbyState === 'declined' || lobbyState === 'expired'}>
						<span class="question-mark">
							{lobbyState === 'declined' ? '✗' : lobbyState === 'expired' ? '⏱' : '?'}
						</span>
					</div>
					{#if lobbyState === 'waiting'}
						<div class="pulse-ring"></div>
					{/if}
				{/if}
			</div>
			<span class="player-name">{opponent.username}</span>
			{#if lobbyState === 'waiting'}
				<span class="player-badge pending">Pending</span>
			{:else if lobbyState === 'connecting'}
				<span class="player-badge ready">Connected</span>
			{:else if lobbyState === 'declined'}
				<span class="player-badge declined-badge">Declined</span>
			{:else}
				<span class="player-badge expired-badge">No response</span>
			{/if}
		</div>
	</div>

	<!-- Match settings -->
	<div class="settings-row">
		<div class="setting">
			<span class="setting-value">{speedEmoji(settings.speedPreset)} {capitalize(settings.speedPreset)}</span>
			<span class="setting-label">Speed</span>
		</div>
		<div class="setting">
			<span class="setting-value">{scoreLabels[settings.winScore] ?? settings.winScore}</span>
			<span class="setting-label">First to</span>
		</div>
		<div class="setting">
			<span class="setting-value">{modeLabels[settings.mode] ?? settings.mode}</span>
			<span class="setting-label">Mode</span>
		</div>
	</div>

	<!-- Timer (only during waiting) -->
	{#if lobbyState === 'waiting'}
		<div class="timer-area">
			<span class="timer-hint">Challenge expires in</span>
			<span class="timer-display" class:urgent={isUrgent}>{timerDisplay()}</span>
			<div class="timer-track">
				<div
					class="timer-bar"
					class:urgent={isUrgent}
					style="width: {progress}%"
				></div>
			</div>
		</div>
	{/if}

	<!-- Actions -->
	<div class="actions">
		{#if lobbyState === 'waiting'}
			<button class="btn btn-cancel" onclick={onCancel}>Cancel challenge</button>
		{:else if lobbyState === 'declined' || lobbyState === 'expired'}
			<button class="btn btn-back" onclick={onCancel}>← Back</button>
		{/if}
	</div>
</div>

<style>
	.lobby {
		max-width: 460px;
		margin: 0 auto;
		padding: 1rem 1.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	/* ═════════════════════════════════════════════════
	   MINI PONG ANIMATION
	   ═════════════════════════════════════════════════ */
	.pong-mini {
		position: relative;
		width: 200px;
		height: 56px;
		margin-bottom: 1.75rem;
		opacity: 0.5;
	}

	.pong-paddle {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 5px;
		height: 28px;
		border-radius: 2px;
	}

	.pong-paddle.left {
		left: 8px;
		background: #ff6b9d;
	}

	.pong-paddle.right {
		right: 8px;
		background: #c084fc;
	}

	.pong-paddle.dimmed {
		background: #6b7280;
		opacity: 0.3;
	}

	.pong-center-line {
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
		width: 0;
		border-left: 1px dashed rgba(255, 255, 255, 0.08);
	}

	.pong-ball {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 8px;
		height: 8px;
		background: #ff6b9d;
		border-radius: 50%;
		animation: ball-move 2.5s ease-in-out infinite;
	}

	.pong-ball.paused {
		animation-play-state: paused;
		opacity: 0.3;
	}

	/* ═════════════════════════════════════════════════
	   STATUS LABEL
	   ═════════════════════════════════════════════════ */
	.status-area {
		text-align: center;
		margin-bottom: 1.75rem;
	}

	.status-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: #ff6b9d;
		margin-bottom: 0.35rem;
	}

	.status-label.connecting { color: #4ade80; }
	.status-label.declined { color: #f87171; }
	.status-label.expired { color: #6b7280; }

	.status-dots {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 3px;
	}

	.status-text {
		font-size: 0.85rem;
		color: #6b7280;
		margin-right: 2px;
	}

	.status-text-single {
		font-size: 0.85rem;
		color: #6b7280;
	}

	.dot {
		display: inline-block;
		width: 4px;
		height: 4px;
		background: #6b7280;
		border-radius: 50%;
		animation: dot-bounce 1.4s ease infinite;
	}

	.dot.d2 { animation-delay: 0.2s; }
	.dot.d3 { animation-delay: 0.4s; }

	/* ═════════════════════════════════════════════════
	   VS LAYOUT
	   ═════════════════════════════════════════════════ */
	.vs-layout {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		margin-bottom: 1.75rem;
		width: 100%;
	}

	.player {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		min-width: 100px;
	}

	.avatar-wrapper {
		position: relative;
	}

	.avatar {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.you-avatar {
		background: linear-gradient(135deg, #ff6b9d, #c084fc);
	}

	.opponent-avatar.connected {
		background: linear-gradient(135deg, #c084fc, #6366f1);
	}

	.opponent-placeholder {
		background: transparent;
		border: 2px dashed rgba(255, 255, 255, 0.1);
		animation: float 3s ease-in-out infinite;
	}

	.opponent-placeholder.error-state {
		border-color: rgba(248, 113, 113, 0.2);
		animation: none;
	}

	.question-mark {
		color: #4b5563;
		font-size: 1.5rem;
	}

	.pulse-ring {
		position: absolute;
		inset: -6px;
		border-radius: 50%;
		border: 2px solid rgba(255, 107, 157, 0.2);
		animation: pulse-ring 2s ease-out infinite;
	}

	.player-name {
		font-size: 0.9rem;
		font-weight: 700;
		color: #f3f4f6;
	}

	.player-badge {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
	}

	.player-badge.ready {
		background: rgba(74, 222, 128, 0.1);
		color: #4ade80;
	}

	.player-badge.pending {
		background: rgba(234, 179, 8, 0.08);
		color: #eab308;
	}

	.player-badge.declined-badge {
		background: rgba(248, 113, 113, 0.08);
		color: #f87171;
	}

	.player-badge.expired-badge {
		background: rgba(107, 114, 128, 0.08);
		color: #6b7280;
	}

	.vs-divider {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
	}

	.vs-text {
		font-size: 0.75rem;
		font-weight: 700;
		color: #4b5563;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.vs-line {
		width: 1px;
		height: 20px;
		background: rgba(255, 255, 255, 0.06);
	}

	/* ═════════════════════════════════════════════════
	   SETTINGS ROW
	   ═════════════════════════════════════════════════ */
	.settings-row {
		display: flex;
		justify-content: center;
		gap: 1.75rem;
		margin-bottom: 1.5rem;
		padding: 0.75rem 1.5rem;
		border-radius: 0.6rem;
		background: #16213e;
		border: 1px solid rgba(255, 255, 255, 0.04);
		width: 100%;
		max-width: 320px;
	}

	.setting { text-align: center; }

	.setting-value {
		display: block;
		font-size: 0.9rem;
		font-weight: 700;
		color: #d1d5db;
	}

	.setting-label {
		display: block;
		font-size: 0.6rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-top: 0.1rem;
	}

	/* ═════════════════════════════════════════════════
	   TIMER
	   ═════════════════════════════════════════════════ */
	.timer-area {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.timer-hint {
		display: block;
		font-size: 0.75rem;
		color: #4b5563;
		margin-bottom: 0.25rem;
	}

	.timer-display {
		display: block;
		font-size: 1.25rem;
		font-weight: 700;
		color: #ff6b9d;
		margin-bottom: 0.5rem;
	}

	.timer-display.urgent {
		color: #f87171;
	}

	.timer-track {
		width: 200px;
		height: 3px;
		background: rgba(255, 255, 255, 0.04);
		border-radius: 2px;
		margin: 0 auto;
		overflow: hidden;
	}

	.timer-bar {
		height: 100%;
		background: linear-gradient(90deg, #ff6b9d, #c084fc);
		border-radius: 2px;
		transition: width 1s linear;
	}

	.timer-bar.urgent {
		background: #f87171;
	}

	/* ═════════════════════════════════════════════════
	   ACTIONS
	   ═════════════════════════════════════════════════ */
	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn {
		padding: 0.6rem 2rem;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-cancel {
		background: #16213e;
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: #9ca3af;
	}

	.btn-cancel:hover {
		border-color: rgba(248, 113, 113, 0.3);
		color: #f87171;
	}

	.btn-back {
		background: rgba(255, 107, 157, 0.08);
		border: 1px solid rgba(255, 107, 157, 0.2);
		color: #ff6b9d;
	}

	.btn-back:hover {
		background: rgba(255, 107, 157, 0.12);
	}

	/* ═════════════════════════════════════════════════
	   ANIMATIONS
	   ═════════════════════════════════════════════════ */
	@keyframes ball-move {
		0% { left: 28px; }
		50% { left: calc(100% - 36px); }
		100% { left: 28px; }
	}

	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-6px); }
	}

	@keyframes dot-bounce {
		0%, 80%, 100% { transform: translateY(0); }
		40% { transform: translateY(-6px); }
	}

	@keyframes pulse-ring {
		0% { transform: scale(1); opacity: 0.4; }
		100% { transform: scale(1.6); opacity: 0; }
	}

	/* ═════════════════════════════════════════════════
	   RESPONSIVE
	   ═════════════════════════════════════════════════ */
	@media (max-width: 500px) {
		.vs-layout { gap: 1.25rem; }
		.player { min-width: 80px; }
		.avatar { width: 56px; height: 56px; }
		.settings-row { gap: 1.25rem; padding: 0.65rem 1rem; }
	}
</style>