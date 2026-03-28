<script lang="ts">
	import { getThemesByCategory } from './themes';

	let {
		selectedThemeId,
		onThemeChange,
	}: {
		selectedThemeId: string;
		onThemeChange: (id: string) => void;
	} = $props();

	const darkThemes = getThemesByCategory('dark');
	const pastelThemes = getThemesByCategory('pastel');
</script>

<div class="theme-picker">
	<div class="category-label">Dark</div>
	<div class="theme-grid">
		{#each darkThemes as theme}
			<button
				class="theme-swatch"
				class:active={selectedThemeId === theme.id}
				onclick={() => onThemeChange(theme.id)}
				title={theme.name}
			>
				<div class="swatch-colors">
					<div
						class="swatch-bg"
						style="background:{theme.colors.background}"
					></div>
					<div class="swatch-ball" style="background:{theme.colors.ball}"></div>
					<div
						class="swatch-paddle"
						style="background:{theme.colors.paddle1}"
					></div>
				</div>
				<span class="swatch-name">{theme.name}</span>
			</button>
		{/each}
	</div>

	<div class="category-label">Pastel</div>
	<div class="theme-grid">
		{#each pastelThemes as theme}
			<button
				class="theme-swatch"
				class:active={selectedThemeId === theme.id}
				onclick={() => onThemeChange(theme.id)}
				title={theme.name}
			>
				<div class="swatch-colors">
					<div
						class="swatch-bg"
						style="background:{theme.colors.background}"
					></div>
					<div class="swatch-ball" style="background:{theme.colors.ball}"></div>
					<div
						class="swatch-paddle"
						style="background:{theme.colors.paddle1}"
					></div>
				</div>
				<span class="swatch-name">{theme.name}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.theme-picker {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.category-label {
		font-size: 0.7rem;
		color: #9ca3af;
		text-transform: uppercase;
		letter-spacing: 1px;
	}
	.theme-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}
	.theme-swatch {
		background: rgba(255, 255, 255, 0.03);
		border: 2px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		padding: 6px;
		cursor: pointer;
		transition: all 0.15s;
		text-align: center;
	}
	.theme-swatch:hover {
		border-color: rgba(255, 107, 157, 0.3);
	}
	.theme-swatch.active {
		border-color: #ff6b9d;
		box-shadow: 0 0 10px rgba(255, 107, 157, 0.2);
	}
	.swatch-colors {
		display: flex;
		gap: 3px;
		justify-content: center;
		margin-bottom: 4px;
	}
	.swatch-bg {
		width: 20px;
		height: 20px;
		border-radius: 4px;
	}
	.swatch-ball {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		align-self: center;
	}
	.swatch-paddle {
		width: 4px;
		height: 18px;
		border-radius: 2px;
		align-self: center;
	}
	.swatch-name {
		font-size: 0.6rem;
		color: #d1d5db;
	}
</style>
