	<script lang="ts">
	import { fly } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';
	import { speedEmoji, speedLabel } from '$lib/utils/format_game';
	import UserAvatar from '$lib/component/common/UserAvatar.svelte';

	// interface Props {
	// 	inviteId: string;
	// 	fromUsername: string;
	// 	onAccept: () => void;
	// 	onDecline: () => void;
	// }
	type Props = {
		challenger: {
			username: string;
			displayName: string | null;
			avatarUrl: string | null;
		};
		settings: {
			speedPreset: string;
			winScore: number;
		};
		timeoutSecs?: number;
		onAccept: () => void;
		onDecline: () => void;
	};

	let { challenger, settings, timeoutSecs = 30, onAccept, onDecline }: Props = $props();
	// const initialTimeout = timeoutSecs;
	let remaining = $state(30);
	let exiting = $state(false);

	// SVG circle math
	const RADIUS = 21;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~131.95

	let dashOffset = $derived(
		CIRCUMFERENCE * (1 - remaining / timeoutSecs)
	);

	$effect(() => {
		const interval = setInterval(() => {
			remaining--;
			if (remaining <= 0) {
				clearInterval(interval);
			}
		}, 1000);

		return () => clearInterval(interval);
	});

</script>

<div class="modal-overlay">
	<div class="modal">
		<!-- Glow effect -->
		<div class="glow"></div>

		<!-- Icon -->
		<div class="icon">⚔️</div>

		<!-- Label -->
		<div class="label">Game Challenge</div>
		<div class="challenger">
			<div class="avatar">
				<UserAvatar avatarUrl={challenger.avatarUrl} username={challenger.username} displayName={challenger.displayName} size="lg" />
			</div>
			<div class="challenger-text">
				<!-- <span class="challenger-name">{challenger.username}</span> -->
				<span class="challenger-name">{challenger.displayName ?? challenger.username}</span>
				<span class="card-handle">@{challenger.username.toLowerCase()}</span>
			</div>
		</div>
		<span class="challenger-sub">Wants to play Pong!</span>
		<!-- Game Settings -->
		<div class="settings-row">
			<div class="setting">
				<span class="setting-label">Speed</span>
				<span class="setting-value">{speedEmoji(settings.speedPreset)} {speedLabel(settings.speedPreset)}</span>
			</div>
			<div class="setting">
				<span class="setting-label">Win Score</span>
				<span class="setting-value">{settings.winScore}</span>
			</div>
			<div class="setting">
				<span class="setting-label">Mode</span>
				<span class="setting-value">1v1</span>
			</div>
		</div>

		<div class="timer-ring">
			<svg width="48" height="48" viewBox="0 0 48 48">
				<circle class="ring-bg" cx="24" cy="24" r={RADIUS} />
				<circle
					class="ring-fg"
					class:urgent={remaining <= 10}
					cx="24"
					cy="24"
					r={RADIUS}
					style="stroke-dasharray: {CIRCUMFERENCE}; stroke-dashoffset: {dashOffset};"
				/>
			</svg>
			<span class="timer-text" class:urgent={remaining <= 10}>
				{remaining}
			</span>
		</div>

		<div class="actions">
			<button class="btn-accept" onclick={onAccept}>⚔️ Accept</button>
			<button class="btn-decline" onclick={onDecline}>❌ Decline</button>
		</div>
	</div>
</div>

	<style>
	/* ═════════════════════════════════════════════════
	   OVERLAY
	   ═════════════════════════════════════════════════ */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(5, 5, 15, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		animation: overlay-in 0.3s ease;
		backdrop-filter: blur(4px);
	}

	/* .overlay.exit {
		animation: overlay-out 0.3s ease forwards;
	} */

	/* ═════════════════════════════════════════════════
	   MODAL
	   ═════════════════════════════════════════════════ */
	.modal {
		background: linear-gradient(160deg, #1a1035 0%, #0d1525 100%);
		border: 1px solid rgba(255, 107, 157, 0.15);
		border-radius: 1rem;
		padding: 2rem 2.25rem;
		max-width: 380px;
		width: 100%;
		text-align: center;
		animation: modal-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
		box-shadow:
			0 20px 60px rgba(0, 0, 0, 0.5),
			0 0 80px rgba(255, 107, 157, 0.05);
		position: relative;
		overflow: hidden;
	}

	/* .modal.exit {
		animation: modal-out 0.3s ease forwards;
	} */

	/* ═════════════════════════════════════════════════
	   GLOW + ICON
	   ═════════════════════════════════════════════════ */
	.glow {
		position: absolute;
		top: -40px;
		left: 50%;
		transform: translateX(-50%);
		width: 200px;
		height: 80px;
		background: radial-gradient(ellipse, rgba(255, 107, 157, 0.15) 0%, transparent 70%);
		pointer-events: none;
	}

	.icon {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
		animation: icon-bounce 0.6s ease;
	}

	.label {
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: #ff6b9d;
		margin-bottom: 0.75rem;
	}

	/* ═════════════════════════════════════════════════
	   CHALLENGER
	   ═════════════════════════════════════════════════ */
	.challenger {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		justify-content: center;
		margin-bottom: 1rem;
	}

	/* .avatar {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ff6b9d, #c084fc);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		overflow: hidden;
	} */

	.challenger-text {
		text-align: left;
	}

	.challenger-name {
		display: block;
		font-size: 1.2rem;
		font-weight: 700;
		color: #f3f4f6;
	}

	.card-handle {
		font-size: 0.78rem;
		color: #6b7280;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.challenger-sub {
		display: block;
		padding-bottom: 0.5rem;
		font-size: 0.88rem;
		color: #d1d5db;
		/* margin-top: 0.1rem; */
	}

	/* ═════════════════════════════════════════════════
	   SETTINGS
	   ═════════════════════════════════════════════════ */
	.settings-row {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		margin-bottom: 1.25rem;
		padding: 0.65rem;
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.03);
	}

	.setting {
		text-align: center;
	}

	.setting-label {
		display: block;
		font-size: 0.6rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.setting-value {
		display: block;
		font-size: 0.9rem;
		font-weight: 600;
		color: #d1d5db;
		margin-top: 0.1rem;
	}

	/* ═════════════════════════════════════════════════
	   COUNTDOWN RING
	   ═════════════════════════════════════════════════ */
	.timer-ring {
		width: 48px;
		height: 48px;
		margin: 0 auto 1rem;
		position: relative;
	}

	.timer-ring svg {
		transform: rotate(-90deg);
	}

	.ring-bg,
	.ring-fg {
		fill: none;
		stroke-width: 3;
	}

	.ring-bg {
		stroke: rgba(255, 255, 255, 0.06);
	}

	.ring-fg {
		stroke: #ff6b9d;
		stroke-linecap: round;
		transition: stroke-dashoffset 1s linear;
	}

	.ring-fg.urgent {
		stroke: #f87171;
		animation: ring-pulse 1s ease infinite;
	}

	.timer-text {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.85rem;
		font-weight: 700;
		color: #ff6b9d;
	}

	.timer-text.urgent {
		color: #f87171;
	}

	/* ═════════════════════════════════════════════════
	   ACTIONS
	   ═════════════════════════════════════════════════ */
	.actions {
		display: flex;
		gap: 0.6rem;
	}

	.btn-accept {
		flex: 1;
		padding: 0.7rem;
		border: none;
		border-radius: 0.5rem;
		background: #ff6b9d;
		color: #fff;
		font-weight: 600;
		font-size: 0.9rem;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-accept:hover {
		background: #ff85b1;
		transform: scale(1.02);
	}

	.btn-decline {
		flex: 1;
		padding: 0.7rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.03);
		color: #9ca3af;
		font-weight: 500;
		font-size: 0.9rem;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-decline:hover {
		border-color: rgba(248, 113, 113, 0.3);
		color: #f87171;
	}

	/* ═════════════════════════════════════════════════
	   ANIMATIONS
	   ═════════════════════════════════════════════════ */
	@keyframes overlay-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes overlay-out {
		from { opacity: 1; }
		to { opacity: 0; }
	}

	@keyframes modal-in {
		from { opacity: 0; transform: scale(0.85); }
		to { opacity: 1; transform: scale(1); }
	}

	@keyframes modal-out {
		from { opacity: 1; transform: scale(1); }
		to { opacity: 0; transform: scale(0.85); }
	}

	@keyframes icon-bounce {
		0% { transform: scale(0); }
		60% { transform: scale(1.2); }
		100% { transform: scale(1); }
	}

	@keyframes ring-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
