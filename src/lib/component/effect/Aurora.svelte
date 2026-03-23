<script lang="ts">
	type Props = {
		bgColor?: string;
	};

	let { bgColor = '' }: Props = $props();

	$effect(() => {
		if (!bgColor) return;
		const prev = document.body.style.backgroundColor;
		document.body.style.backgroundColor = bgColor;
		return () => {
			document.body.style.backgroundColor = prev;
		};
	});
</script>

<div class="aurora">
	<div class="aurora-blob blob-1"></div>
	<div class="aurora-blob blob-2"></div>
	<div class="aurora-blob blob-3"></div>
</div>

<style>
	.aurora {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}

	.aurora-blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(100px);
		opacity: 0.12;
	}

	.blob-1 {
		width: 600px;
		height: 400px;
		background: linear-gradient(135deg, #a855f7, #ff6b9d);
		top: -100px;
		left: -100px;
		animation: aurora-drift-1 12s ease-in-out infinite alternate;
	}

	.blob-2 {
		width: 500px;
		height: 350px;
		background: linear-gradient(135deg, #6366f1, #60a5fa);
		bottom: -80px;
		right: -80px;
		animation: aurora-drift-2 15s ease-in-out infinite alternate;
	}

	.blob-3 {
		width: 400px;
		height: 300px;
		background: linear-gradient(135deg, #ff6b9d, #c084fc);
		top: 40%;
		left: 50%;
		transform: translate(-50%, -50%);
		animation: aurora-drift-3 10s ease-in-out infinite alternate;
	}

	@keyframes aurora-drift-1 {
		0% { transform: translate(0, 0) scale(1); }
		100% { transform: translate(150px, 80px) scale(1.3); }
	}

	@keyframes aurora-drift-2 {
		0% { transform: translate(0, 0) scale(1); }
		100% { transform: translate(-120px, -60px) scale(1.2); }
	}

	@keyframes aurora-drift-3 {
		0% { transform: translate(-50%, -50%) scale(1); opacity: 0.08; }
		100% { transform: translate(-30%, -40%) scale(1.4); opacity: 0.15; }
	}
</style>
