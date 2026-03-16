<script lang="ts">
	type Props = {
		starCount?: number;
		bgColor?: string;
	};

	let { starCount = 80, bgColor = '' }: Props = $props();

	$effect(() => {
		if (!bgColor) return;
		const prev = document.body.style.backgroundColor;
		document.body.style.backgroundColor = bgColor;
		return () => {
			document.body.style.backgroundColor = prev;
		};
	});

	// Generate stars once
	const stars = Array.from({ length: starCount }, () => ({
		x: Math.random() * 100,
		y: Math.random() * 100,
		size: 1 + Math.random() * 2,
		duration: 3 + Math.random() * 7,
		delay: Math.random() * 5,
		opacity: 0.2 + Math.random() * 0.6,
	}));
</script>

<div class="starfield">
	{#each stars as star}
		<div
			class="star"
			style="
				left: {star.x}%;
				top: {star.y}%;
				width: {star.size}px;
				height: {star.size}px;
				--star-opacity: {star.opacity};
				animation-duration: {star.duration}s;
				animation-delay: {star.delay}s;
			"
		></div>
	{/each}
</div>

<style>
	.starfield {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}

	.star {
		position: absolute;
		border-radius: 50%;
		background: white;
		opacity: var(--star-opacity);
		animation: twinkle ease-in-out infinite alternate;
	}

	@keyframes twinkle {
		0% { opacity: 0.1; transform: scale(0.8); }
		100% { opacity: var(--star-opacity); transform: scale(1.2); }
	}
</style>
