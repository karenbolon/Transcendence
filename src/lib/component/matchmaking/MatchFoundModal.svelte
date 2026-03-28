<script lang="ts">
	type Props = {
		opponent: { username: string; avatarUrl: string | null };
		settings: { speedPreset: string; winScore: number };
		onAccept: () => void;
		onDecline: () => void;
	};

	let { opponent, settings, onAccept, onDecline }: Props = $props();

	function speedEmoji(preset: string): string {
		switch (preset) {
			case 'chill': return '🐢';
			case 'normal': return '🏓';
			case 'fast': return '🔥';
			default: return '🎲';
		}
	}

	function capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}
</script>

<div class="modal-backdrop">
	<div class="modal">
		<div class="modal-header">
			<span class="match-icon">🎮</span>
			<h3 class="modal-title">Match Found!</h3>
		</div>

		<div class="modal-body">
			<div class="opponent-info">
				<span class="opponent-label">Opponent</span>
				<span class="opponent-name">{opponent.username}</span>
			</div>
			<div class="settings-info">
				<span class="settings-label">{speedEmoji(settings.speedPreset)} {capitalize(settings.speedPreset)}</span>
				<span class="settings-sep">·</span>
				<span class="settings-label">First to {settings.winScore}</span>
			</div>
		</div>

		<div class="modal-actions">
			<button class="btn-accept" onclick={onAccept}>Accept</button>
			<button class="btn-decline" onclick={onDecline}>Decline</button>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal {
		background: #1a1a2e;
		border: 1px solid rgba(255, 107, 157, 0.2);
		border-radius: 0.75rem;
		padding: 1.5rem 2rem;
		max-width: 360px;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		animation: modal-in 0.2s ease-out;
	}

	@keyframes modal-in {
		from { transform: scale(0.95); opacity: 0; }
		to { transform: scale(1); opacity: 1; }
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.match-icon {
		font-size: 1.5rem;
	}

	.modal-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: #ff6b9d;
		margin: 0;
	}

	.modal-body {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.opponent-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
	}

	.opponent-label {
		font-size: 0.65rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.opponent-name {
		font-size: 1rem;
		font-weight: 700;
		color: #f3f4f6;
	}

	.settings-info {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: #9ca3af;
	}

	.settings-sep {
		color: #374151;
	}

	.modal-actions {
		display: flex;
		gap: 0.5rem;
		width: 100%;
	}

	.btn-accept {
		flex: 1;
		padding: 0.6rem;
		border-radius: 0.5rem;
		border: none;
		background: #ff6b9d;
		color: #fff;
		font-size: 0.85rem;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-accept:hover {
		background: #ff85b1;
	}

	.btn-decline {
		flex: 1;
		padding: 0.6rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: transparent;
		color: #9ca3af;
		font-size: 0.85rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-decline:hover {
		border-color: rgba(255, 255, 255, 0.15);
		color: #d1d5db;
	}
</style>
