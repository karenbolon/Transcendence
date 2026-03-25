<script lang="ts">
	import type { EffectsPreset, EffectsCustom } from './effectsEngine';

	let { preset, customConfig, onPresetChange, onCustomChange }: {
		preset: EffectsPreset;
		customConfig: EffectsCustom;
		onPresetChange: (p: EffectsPreset) => void;
		onCustomChange: (c: EffectsCustom) => void;
	} = $props();

	const presets: { key: EffectsPreset; label: string }[] = [
		{ key: 'none', label: 'None' },
		{ key: 'subtle', label: 'Subtle' },
		{ key: 'arcade', label: 'Arcade' },
		{ key: 'spectacle', label: 'Spectacle' },
		{ key: 'custom', label: 'Custom' },
	];

	function updateCustom(key: keyof EffectsCustom, value: unknown) {
		onCustomChange({ ...customConfig, [key]: value });
	}
</script>

<div class="effects-settings">
	<div class="preset-row">
		{#each presets as p}
			<button
				class="preset-btn"
				class:active={preset === p.key}
				onclick={() => onPresetChange(p.key)}
			>
				{p.label}
			</button>
		{/each}
	</div>

	{#if preset === 'custom'}
		<div class="custom-toggles">
			<label class="toggle-row">
				<span>Trail</span>
				<select value={customConfig.trail} onchange={(e) => updateCustom('trail', e.currentTarget.value)}>
					<option value="off">Off</option>
					<option value="short">Short</option>
					<option value="long">Long</option>
				</select>
			</label>
			<label class="toggle-row">
				<span>Particles</span>
				<input type="checkbox" checked={customConfig.particles} onchange={(e) => updateCustom('particles', e.currentTarget.checked)} />
			</label>
			<label class="toggle-row">
				<span>Screen shake</span>
				<input type="checkbox" checked={customConfig.screenShake} onchange={(e) => updateCustom('screenShake', e.currentTarget.checked)} />
			</label>
			<label class="toggle-row">
				<span>Speed lines</span>
				<input type="checkbox" checked={customConfig.speedLines} onchange={(e) => updateCustom('speedLines', e.currentTarget.checked)} />
			</label>
			<label class="toggle-row">
				<span>Chromatic aberration</span>
				<input type="checkbox" checked={customConfig.chromaticAberration} onchange={(e) => updateCustom('chromaticAberration', e.currentTarget.checked)} />
			</label>
			<label class="toggle-row">
				<span>Freeze frames</span>
				<input type="checkbox" checked={customConfig.freezeFrames} onchange={(e) => updateCustom('freezeFrames', e.currentTarget.checked)} />
			</label>
		</div>
	{/if}
</div>

<style>
	.effects-settings { display: flex; flex-direction: column; gap: 8px; }
	.preset-row { display: flex; gap: 0.3rem; flex-wrap: wrap; }
	.preset-btn {
		padding: 0.3rem 0.6rem;
		border-radius: 0.4rem;
		border: 1px solid rgba(255,255,255,0.08);
		background: rgba(255,255,255,0.03);
		color: #6b7280;
		font-size: 0.75rem;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}
	.preset-btn:hover { border-color: rgba(255,107,157,0.3); color: #d1d5db; }
	.preset-btn.active {
		background: rgba(255,107,157,0.15);
		border-color: rgba(255,107,157,0.4);
		color: #ff6b9d;
		font-weight: 600;
	}
	.custom-toggles {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 8px;
		background: rgba(255,255,255,0.02);
		border-radius: 6px;
	}
	.toggle-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.75rem;
		color: #9ca3af;
		cursor: pointer;
	}
	.toggle-row select {
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 4px;
		color: #d1d5db;
		font-size: 0.7rem;
		padding: 2px 4px;
	}
	.toggle-row input[type="checkbox"] {
		accent-color: #ff6b9d;
	}
</style>
