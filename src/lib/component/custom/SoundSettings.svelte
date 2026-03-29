<script lang="ts">
	let { volume, muted, onVolumeChange, onMuteChange }: {
		volume: number;
		muted: boolean;
		onVolumeChange: (v: number) => void;
		onMuteChange: (m: boolean) => void;
	} = $props();
</script>

<div class="sound-settings">
	<div class="sound-row">
		<span class="sound-label">Volume</span>
		<input
			type="range"
			min="0"
			max="100"
			value={volume}
			oninput={(e) => onVolumeChange(Number(e.currentTarget.value))}
			class="volume-slider"
		/>
		<span class="volume-value">{volume}%</span>
	</div>
	<div class="sound-row">
		<span class="sound-label">Mute</span>
		<button class="mute-toggle" class:active={muted} onclick={() => onMuteChange(!muted)}>
			{muted ? '🔇 Muted' : '🔊 On'}
		</button>
	</div>
</div>

<style>
	.sound-settings { display: flex; flex-direction: column; gap: 8px; }
	.sound-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.sound-label {
		font-size: 0.75rem;
		color: #9ca3af;
		min-width: 50px;
	}
	.volume-slider {
		flex: 1;
		accent-color: #ff6b9d;
		height: 4px;
	}
	.volume-value {
		font-size: 0.7rem;
		color: #6b7280;
		min-width: 32px;
		text-align: right;
	}
	.mute-toggle {
		padding: 0.25rem 0.6rem;
		border-radius: 0.4rem;
		border: 1px solid rgba(255,255,255,0.08);
		background: rgba(255,255,255,0.03);
		color: #6b7280;
		font-size: 0.75rem;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}
	.mute-toggle.active {
		background: rgba(255,107,157,0.15);
		border-color: rgba(255,107,157,0.4);
		color: #ff6b9d;
	}
</style>
