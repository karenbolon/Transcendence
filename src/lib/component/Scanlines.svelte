<script lang="ts">
	type Props = {
		opacity?: number;
		bgColor?: string;
	};

	let { opacity = 0.04, bgColor = '' }: Props = $props();

	$effect(() => {
		if (!bgColor) return;
		const prev = document.body.style.backgroundColor;
		document.body.style.backgroundColor = bgColor;
		return () => {
			document.body.style.backgroundColor = prev;
		};
	});
</script>

<div class="scanlines" style="--scan-opacity: {opacity}"></div>

<style>
	.scanlines {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
		background: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 2px,
			rgba(0, 0, 0, var(--scan-opacity)) 2px,
			rgba(0, 0, 0, var(--scan-opacity)) 4px
		);
	}

	.scanlines::after {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at center,
			transparent 50%,
			rgba(0, 0, 0, 0.15) 100%
		);
	}
</style>
