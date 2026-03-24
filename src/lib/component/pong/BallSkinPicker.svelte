<script lang="ts">
	import { BALL_SKINS, type BallSkin } from './ballSkins';
	import { getTheme } from './themes';

	let { selectedSkinId, themeId, onSkinChange }: {
		selectedSkinId: string;
		themeId: string;
		onSkinChange: (id: string) => void;
	} = $props();

	let compatibleSkins = $derived(() => {
		const theme = getTheme(themeId);
		return BALL_SKINS.filter(s => theme.compatibleBallSkins.includes(s.id));
	});
</script>

<div class="skin-picker">
	<div class="skin-grid">
		{#each compatibleSkins() as skin}
			<button
				class="skin-swatch"
				class:active={selectedSkinId === skin.id}
				onclick={() => onSkinChange(skin.id)}
				title={skin.name}
			>
				<div class="skin-preview" style="background:{skin.color ?? 'var(--theme-ball, #ff6b9d)'}; {skin.id === 'void-orb' ? 'background:#000;border:2px solid #fff;' : ''}">
					{#if skin.id === 'pixel'}
						<div class="pixel-shape"></div>
					{/if}
				</div>
				<span class="skin-name">{skin.name}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.skin-picker { display: flex; flex-direction: column; gap: 6px; }
	.skin-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
	.skin-swatch {
		background: rgba(255,255,255,0.03);
		border: 2px solid rgba(255,255,255,0.08);
		border-radius: 8px;
		padding: 6px;
		cursor: pointer;
		transition: all 0.15s;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}
	.skin-swatch:hover { border-color: rgba(255,107,157,0.3); }
	.skin-swatch.active { border-color: #ff6b9d; box-shadow: 0 0 10px rgba(255,107,157,0.2); }
	.skin-preview {
		width: 20px;
		height: 20px;
		border-radius: 50%;
	}
	.pixel-shape {
		width: 100%;
		height: 100%;
		border-radius: 2px !important;
	}
	.skin-name { font-size: 0.55rem; color: #d1d5db; }
</style>
