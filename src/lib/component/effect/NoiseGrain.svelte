<script lang="ts">
	type Props = {
		opacity?: number;
		bgColor?: string;
	};

	let { opacity = 0.03, bgColor = '' }: Props = $props();

	$effect(() => {
		if (!bgColor) return;
		const prev = document.body.style.backgroundColor;
		document.body.style.backgroundColor = bgColor;
		return () => {
			document.body.style.backgroundColor = prev;
		};
	});
</script>

<div class="noise-grain" style="--grain-opacity: {opacity}"></div>

<style>
	.noise-grain {
		position: fixed;
		inset: -50%;
		width: 200%;
		height: 200%;
		pointer-events: none;
		z-index: 0;
		opacity: var(--grain-opacity);
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
		background-repeat: repeat;
		animation: grain-shift 0.5s steps(4) infinite;
	}

	@keyframes grain-shift {
		0% { transform: translate(0, 0); }
		25% { transform: translate(-2%, -3%); }
		50% { transform: translate(3%, 1%); }
		75% { transform: translate(-1%, 2%); }
		100% { transform: translate(2%, -1%); }
	}
</style>
