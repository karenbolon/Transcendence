<script lang="ts">
	type Props = {
		particleCount?: number;
		maxDelay?: number;
		bgColor?: string;
	};

	let { particleCount = 25, maxDelay = 1, bgColor = '' }: Props = $props();

	// Set body background color when mounted, restore on destroy
	$effect(() => {
		if (!bgColor) return;
		const prev = document.body.style.backgroundColor;
		document.body.style.backgroundColor = bgColor;
		return () => {
			document.body.style.backgroundColor = prev;
		};
	});
</script>

<div class="ambient-bg">
	<div class="corner-glow tl"></div>
	<div class="corner-glow br"></div>
	<div class="retro-grid"></div>
	{#each Array(particleCount) as _, i}
		<div
			class="particle"
			style="
				left: {Math.random() * 100}%;
				width: {2 + Math.random() * 4}px;
				height: {2 + Math.random() * 4}px;
				animation-duration: {8 + Math.random() * 12}s;
				animation-delay: {Math.random() * maxDelay}s;
				--particle-color: {['rgba(255,107,157,0.4)', 'rgba(168,85,247,0.3)', 'rgba(96,165,250,0.2)'][i % 3]};
			"
		></div>
	{/each}
</div>

<style>
	.ambient-bg {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}

	.corner-glow {
		position: absolute;
		width: 400px;
		height: 400px;
		border-radius: 50%;
		filter: blur(120px);
	}
	.corner-glow.tl {
		top: -150px;
		left: -150px;
		background: rgba(168, 85, 247, 0.08);
	}
	.corner-glow.br {
		bottom: -150px;
		right: -150px;
		background: rgba(255, 107, 157, 0.06);
	}

	.retro-grid {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 40vh;
		background: linear-gradient(180deg, transparent 0%, rgba(168, 85, 247, 0.03) 100%);
		mask-image: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
		-webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
		overflow: hidden;
	}
	.retro-grid::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			repeating-linear-gradient(90deg, rgba(168,85,247,0.08) 0px, transparent 1px, transparent 60px),
			repeating-linear-gradient(0deg, rgba(168,85,247,0.08) 0px, transparent 1px, transparent 60px);
		transform: perspective(400px) rotateX(55deg);
		transform-origin: bottom;
		animation: grid-scroll 4s linear infinite;
	}
	@keyframes grid-scroll {
		0% { background-position: 0 0; }
		100% { background-position: 0 60px; }
	}

	.particle {
		position: absolute;
		bottom: 0;
		border-radius: 50%;
		background: var(--particle-color);
		box-shadow: 0 0 8px var(--particle-color);
		animation: float-particle linear infinite;
		opacity: 0;
	}
	@keyframes float-particle {
		0%   { transform: translateY(0) scale(0); opacity: 0; }
		10%  { opacity: 0.8; }
		90%  { opacity: 0.8; }
		100% { transform: translateY(-100vh) scale(1); opacity: 0; }
	}
</style>
