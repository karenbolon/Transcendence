<script lang="ts">
	import { getSoundEngine } from './soundEngine';

	let { muted = $bindable(false), onToggle }: {
		muted?: boolean;
		onToggle?: (muted: boolean) => void;
	} = $props();

	function toggle() {
		const se = getSoundEngine();
		se.toggleMute();
		muted = se.muted;
		onToggle?.(muted);
	}

	// Sync if parent changes muted externally
	$effect(() => {
		getSoundEngine().setMuted(muted);
	});
</script>

<button class="mute-btn" onclick={toggle} aria-label={muted ? 'Unmute' : 'Mute'}>
	{muted ? '🔇' : '🔊'}
</button>

<style>
	.mute-btn {
		position: absolute;
		top: 8px;
		right: 8px;
		background: rgba(0,0,0,0.5);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 6px;
		padding: 4px 8px;
		font-size: 1rem;
		cursor: pointer;
		z-index: 10;
		transition: opacity 0.2s;
	}
	.mute-btn:hover { opacity: 0.8; }
</style>
