<script lang="ts">
	import { enhance } from '$app/forms';
	import type { RegisterFormResult } from '$lib/types/form'
	import PasswordInput from '$lib/component/PasswordInput.svelte';
	import PasswordStrength from '$lib/component/PasswordS.svelte';
	import {
		validateUsername,
		validateEmail,
		validatePassword,
		validateConfirmPassword
	} from '$lib/validation/frontend';
	import { _ } from 'svelte-i18n';

	let { form }: { form: RegisterFormResult } = $props();

	// Tracks what user is typing
	let loading = $state(false);
	let username = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');

	let touched = $state({
		username: false,
		email: false,
		password: false,
		confirmPassword: false
	});

	let usernameError = $derived.by(() => {
		if (!touched.username || !username) return '';
		return validateUsername(username);
	});

	let emailError = $derived.by(() => {
		if (!touched.email || !email) return '';
		return validateEmail(email);
	});

	let passwordError = $derived.by(() => {
		if (!touched.password || !password) return '';
		return validatePassword(password);
	});

	let confirmPasswordError = $derived.by(() => {
		if (!touched.confirmPassword || !confirmPassword) return '';
		return validateConfirmPassword(password, confirmPassword);
	});

	// Overall form validity — button is disabled until everything is valid
	let isFormValid = $derived(
		username.length >= 3 &&
		email.includes('@') &&
		password.length >= 8 &&
		password === confirmPassword &&
		!usernameError &&
		!emailError &&
		!passwordError &&
		!confirmPasswordError
	);
</script>

<div class="register-page flex items-center justify-center min-h-[calc(100vh-200px)] px-4 py-8">
	<div class="container">
	<div class="text-center">
		<h1 class="brand-name text-4xl mb-2">{$_('auth.register.title')}</h1>
		<p >{$_('auth.register.subtitle')}</p>
	</div>

	<form method="POST" class="w-full max-w-md space-y-4 p-4" use:enhance={() => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			await update();
		};
	}} >

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
				placeholder={$_('auth.placeholders.register_username')}
				minlength="3"
				maxlength="20"
				required
				bind:value={username}
				onfocusout={() => touched.username = true}
			/>
			{#if usernameError}
				<p class="text-red-500 text-sm mt-1">{usernameError}</p>
			{/if}
			{#if form?.errors?.username}
				<p class="text-red-500 text-sm mt-1">{$_(form.errors.username)}</p>
			{/if}
		</div>

		<div class="form-group">
			<label for="email">{$_('auth.common.email')}</label>
			<input class="form-fill"
				type="email"
				id="email"
				name="email"
				placeholder={$_('auth.placeholders.register_email')}
				required
				bind:value={email}
				onfocusout={() => touched.email = true}
			/>
			{#if emailError}
				<p class="text-red-400 text-sm mt-1">{emailError}</p>
			{/if}
			{#if form?.errors?.email}
				<p class="text-red-500 text-sm mt-1">{$_(form.errors.email)}</p>
			{/if}
		</div>

		<div class="form-group">
			<label for="password">{$_('auth.fields.password')}</label>
			<PasswordInput
				id="password"
				name="password"
				placeholder={$_('auth.placeholders.register_password')}
				minlength={8}
				required
				bind:value={password}
				onfocusout={() => touched.password = true}
			/>
			{#if passwordError}
				<p class="text-red-500 text-sm mt-1">{passwordError}</p>
			{/if}
			{#if form?.errors?.password}
				<p class="text-red-500 text-sm mt-1">{$_(form.errors.password)}</p>
			{/if}

			<PasswordStrength {password} />
		</div>

		<div class="form-group">
			<label for="confirmPassword">{$_('auth.common.confirm_password')}</label>
			<PasswordInput
				id="confirmPassword"
				name="confirmPassword"
				placeholder={$_('auth.placeholders.register_confirm_password')}
				required
				bind:value={confirmPassword}
				onfocusout={() => touched.confirmPassword = true}
			/>
			{#if confirmPasswordError}
				<p class="text-red-500 text-sm mt-1">{confirmPasswordError}</p>
			{/if}
			{#if form?.errors?.confirmPassword}
				<p class="text-red-500 text-sm mt-1">{$_(form.errors.confirmPassword)}</p>
			{/if}
		</div>

		<div >
			<label class="items-start gap-2">
				<input type="checkbox" name="acceptTerms" required class="mt-1" />
				{$_('auth.register.accept_terms_prefix')} <a href="/terms" class="link" target="_blank">{$_('auth.register.terms_link')}</a> {$_('auth.register.and')}
				<a href="/privacy" class="link" target="_blank">{$_('auth.register.privacy_link')}</a>
			</label>
			<p class="text-[0.65rem] text-gray-400">
				<br>
				{$_('auth.register.privacy_note')}
			</p>
		</div>

		<button class="btn-signup w-full py-3" type="submit" disabled={loading || !isFormValid}>
			{#if loading}
				{$_('auth.register.submitting')}
			{:else}
				{$_('auth.register.submit')}
			{/if}
		</button>
	</form>

		<div class="text-center text-sm text-gray-400">
			{$_('auth.register.have_account')}
			<a href="/login" class="link">{$_('auth.register.login_link')}</a>
		</div>

		<!-- OAuth Section (Future) -->
		<div class="sep">
			<div class="relative flex justify-center text-sm">
				<span class="px-2 bg-pong-darker text-gray-400">{$_('auth.register.or_signup_with')}</span>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<button
				type="button"
				class="login py-2 text-sm" disabled>
				{$_('auth.register.oauth_42_coming')}
			</button>
			<button
			type="button"
			class="login py-2 text-sm" disabled>
				{$_('auth.register.oauth_coming')}
			</button>
		</div>
	</div>
</div>
