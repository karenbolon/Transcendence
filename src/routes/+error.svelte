<script lang="ts">
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';

	let statusCode = $derived($page.status || 500);
	let errorMessage = $derived($page.error?.message || $_('error_pages.default_message'));

	let errorInfo = $derived.by(() => ({
		404: {
			emoji: '🎯',
			title: $_('error_pages.404.title'),
			description: $_('error_pages.404.description'),
			footer: $_('error_pages.404.footer')
		},
		401: {
			emoji: '🔒',
			title: $_('error_pages.401.title'),
			description: $_('error_pages.401.description'),
			footer: $_('error_pages.401.footer')
		},
		403: {
			emoji: '🚫',
			title: $_('error_pages.403.title'),
			description: $_('error_pages.403.description'),
			footer: $_('error_pages.403.footer')
		},
		500: {
			emoji: '💥',
			title: $_('error_pages.500.title'),
			description: $_('error_pages.500.description'),
			footer: $_('error_pages.500.footer')
		},
		503: {
			emoji: '🔧',
			title: $_('error_pages.503.title'),
			description: $_('error_pages.503.description'),
			footer: $_('error_pages.503.footer')
		}
	}));

	let fallback = $derived({
		emoji: '⚠️',
		title: $_('error_pages.fallback.title'),
		description: $_('error_pages.fallback.description'),
		footer: $_('error_pages.fallback.footer')
	});

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
			<a href="/" class="btn-login">🏠 {$_('error_pages.actions.go_home')}</a>
			<button onclick={() => window.history.back()} class="btn-signup">
				{$_('error_pages.actions.go_back')}
			</button>
			{#if statusCode === 500}
				<button onclick={() => window.location.reload()} class="btn-signup">
					{$_('error_pages.actions.retry')}
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
