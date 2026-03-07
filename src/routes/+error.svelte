<script lang="ts">
	import { page } from '$app/stores';

	let statusCode = $derived($page.status || 500);
	let errorMessage = $derived($page.error?.message || 'An error occurred');

	const errorInfo: Record<number, { emoji: string; title: string; description: string; footer: string }> = {
		404: {
			emoji: '🎯',
			title: 'Page Not Found',
			description: "Looks like this page doesn't exist. It's out of bounds!",
			footer: "The ball went out of bounds and we couldn't find it... 🏓"
		},
		403: {
			emoji: '🚫',
			title: 'Access Denied',
			description: "You don't have permission to access this resource.",
			footer: 'This area is off-limits. You need the right paddle to enter! 🔐'
		},
		500: {
			emoji: '💥',
			title: 'Server Error',
			description: "Something went wrong on our end. We're working to fix it!",
			footer: 'Our server missed the ball. Game over! 🎮'
		}
	};

	const fallback = {
		emoji: '⚠️',
		title: 'Error',
		description: 'An unexpected error occurred.',
		footer: 'Something unexpected happened in the game! 🕹️'
	};

	let info = $derived(errorInfo[statusCode] || fallback);
</script>

<svelte:head>
	<title>{statusCode} - {info.title}</title>
</svelte:head>

<div class="error-page">
	<div class="error-card">
		<div class="error-emoji">{info.emoji}</div>

		<h1 class="error-code">{statusCode}</h1>
		<h2 class="error-title">{info.title}</h2>
		<p class="error-description">{info.description}</p>

		{#if statusCode !== 404}
			<div class="error-detail">
				<p>{errorMessage}</p>
			</div>
		{/if}

		<div class="error-actions">
			<a href="/" class="btn-login">Go Home</a>
			<button onclick={() => window.history.back()} class="btn-signup">
				Go Back
			</button>
			{#if statusCode === 500}
				<button onclick={() => window.location.reload()} class="btn-signup">
					Retry
				</button>
			{/if}
		</div>

		<p class="error-footer">{info.footer}</p>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - 200px);
		padding: 1rem;
	}

	.error-card {
		max-width: 500px;
		width: 100%;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.error-emoji {
		font-size: 5rem;
	}

	.error-code {
		font-size: 4rem;
		font-weight: 800;
		color: var(--accent);
		margin: 0;
		line-height: 1;
	}

	.error-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: #f3f4f6;
		margin: 0;
	}

	.error-description {
		color: #9ca3af;
		font-size: 1rem;
		margin: 0;
	}

	.error-detail {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 107, 157, 0.15);
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		width: 100%;
	}

	.error-detail p {
		color: #9ca3af;
		font-family: monospace;
		font-size: 0.85rem;
		margin: 0;
		word-break: break-word;
	}

	.error-actions {
		display: flex;
		gap: 0.75rem;
		padding-top: 0.5rem;
	}

	.error-footer {
		color: #4b5563;
		font-size: 0.85rem;
		margin: 0;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		width: 100%;
	}
</style>
