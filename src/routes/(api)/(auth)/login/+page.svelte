<script lang="ts">
	import { enhance } from '$app/forms';
	import type { LoginFormResult } from '$lib/types/form';
	import { validateUsername } from '$lib/validation/frontend';
	import PasswordInput from '$lib/component/PasswordInput.svelte';	
	import { _ } from 'svelte-i18n';

	let { form }: { form: LoginFormResult | null } = $props();
	const loginError = $derived(form?.errorKey);
	let loading = $state(false);
	let username = $state(form?.username ?? '');
	let password = $state('');

	let touched = $state({
		username: false,
		password: false
	});

	let usernameError = $derived.by(() => {
		if (!touched.username || !username) return '';
		return validateUsername(username);
	});

	let passwordError = $derived.by(() => {
		if (!touched.password || !password) return '';
		if (password.length < 1) return $_('auth.errors.password_required');
		return '';
	});

	let isFormValid = $derived(
		username.length >= 3 && password.length >= 1
	);

</script>

<div class="flex items-center justify-center min-h-[calc(100vh-200px)] px-4 py-8">
	<div class="container">
		<div class="text-center">
			<h1 class="brand-name text-4xl mb-2">{$_('auth.login.title')}</h1>
			<p >{$_('auth.login.subtitle')}</p>
		</div>

		<form method="POST" class="w-full max-w-md space-y-4 p-4" use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}>
			{#if form?.errorKey}
				<div class="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm">
					{$_(form.errorKey)}
				</div>
			{/if}

			<div class="form-group">
				<label for="username">{$_('auth.fields.username')}</label>
				<input class="form-fill"
					type="text"
					id="username"
					name="username"
					placeholder={$_('auth.placeholders.username')}
					required
					bind:value={username}
					onfocusout={() => touched.username = true}
				/>
				{#if usernameError}
					<p class="text-red-400 text-sm mt-1">{usernameError}</p>
				{/if}
			</div>

			<div class="form-group">
				<label for="password">{$_('auth.fields.password')}</label>
				<PasswordInput
					id="password"
					name="password"
					placeholder={$_('auth.placeholders.password')}
					bind:value={password}
					onfocusout={() => touched.password = true}
				/>
				{#if passwordError}
					<p class="text-red-400 text-sm mt-1">{passwordError}</p>
				{/if}
			</div>

			<div class="flex items-center justify-between text-sm">
				<label >
					<input type="checkbox" name="rememberMe" />
					{$_('auth.login.remember_me')}
				</label>
				<a href=/forgot-password class="link text-sm">
					{$_('auth.login.forgot_password')}
				</a>
			</div>

			<button class="btn-signup w-full py-3" type="submit" disabled={loading || !isFormValid}>
				{#if loading}
					{$_('auth.login.logging_in')}
				{:else}
					{$_('auth.login.submit')}
				{/if}
			</button>
		</form>

		<div class="text-center text-sm text-gray-400">
			{$_('auth.login.no_account')}
			<a href="/register" class="link">{$_('auth.login.signup_link')}</a>
		</div>

			<!-- coming soon -->
		<div class="sep">
			<div class="relative flex justify-center text-sm">
				<span class="px-2 bg-pong-darker text-gray-400">{$_('auth.login.continue_with')}</span>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<button
				type="button"
				class="btn-secondary py-2 text-sm">
				{$_('auth.login.oauth_42')}
			</button>
			<button
			type="button"
			class="btn-secondary py-2 text-sm">
				{$_('auth.login.oauth')}
			</button>
		</div>
	</div>
</div>