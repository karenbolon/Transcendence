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

	let { form }: { form: RegisterFormResult | null } = $props();

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
		<h1 class="brand-name text-4xl mb-2">Sign Up</h1>
		<p >Join the game and start playing!</p>
	</div>

	<form method="POST" class="w-full max-w-md space-y-4 p-4" use:enhance={() => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			await update();
		};
	}} >

		{#if form?.error}
			<div class="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm">
				{form.error}
			</div>
		{/if}

		<div class="form-group">
			<label for="username">Username</label>
			<input class="form-fill"
				type="text"
				id="username"
				name="username"
				placeholder="Choose a username"
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
				<p class="text-red-500 text-sm mt-1">{form.errors.username}</p>
			{/if}
		</div>

		<div class="form-group">
			<label for="email">Email</label>
			<input class="form-fill"
				type="email"
				id="email"
				name="email"
				placeholder="your.email@example.com"
				required
				bind:value={email}
				onfocusout={() => touched.email = true}
			/>
			{#if emailError}
				<p class="text-red-400 text-sm mt-1">{emailError}</p>
			{/if}
			{#if form?.errors?.email}
				<p class="text-red-500 text-sm mt-1">{form.errors.email}</p>
			{/if}
		</div>

		<div class="form-group">
			<label for="password">Password</label>
			<PasswordInput
				id="password"
				name="password"
				placeholder="Create a password"
				minlength={8}
				required
				bind:value={password}
				onfocusout={() => touched.password = true}
			/>
			{#if passwordError}
				<p class="text-red-500 text-sm mt-1">{passwordError}</p>
			{/if}
			{#if form?.errors?.password}
				<p class="text-red-500 text-sm mt-1">{form.errors.password}</p>
			{/if}

			<PasswordStrength {password} />
		</div>

		<div class="form-group">
			<label for="confirmPassword">Confirm Password</label>
			<PasswordInput
				id="confirmPassword"
				name="confirmPassword"
				placeholder="Re-enter your password"
				required
				bind:value={confirmPassword}
				onfocusout={() => touched.confirmPassword = true}
			/>
			{#if confirmPasswordError}
				<p class="text-red-500 text-sm mt-1">{confirmPasswordError}</p>
			{/if}
			{#if form?.errors?.confirmPassword}
				<p class="text-red-500 text-sm mt-1">{form.errors.confirmPassword}</p>
			{/if}
		</div>

		<div >
			<label class="items-start gap-2 cursor-pointer">
				<input type="checkbox" name="acceptTerms" required class="mt-1" />
				I agree to the <a href="/terms" class="link" target="_blank">Terms of Service</a> and
				<a href="/privacy" class="link" target="_blank">Privacy Policy</a>
			</label>
			<p class="text-[0.65rem] text-gray-400">
				<br>
				We use your email and username to create and secure your accounts.
				<br>No tracking or analytics cookies are used.
			</p>
		</div>

		<button class="btn-signup w-full py-3" type="submit" disabled={loading || !isFormValid}>
			{#if loading}
				Signing up...
			{:else}
				Sign Up
			{/if}
		</button>
	</form>

		<div class="text-center text-sm text-gray-400">
			Already have an account?
			<a href="/login" class="link">Login</a>
		</div>

		<!-- OAuth Section -->
		<div class="sep">
			<div class="relative flex justify-center text-sm">
				<span class="px-2 bg-pong-darker text-gray-400">Or sign up with</span>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<a
				href="/login/github"
				class="login py-2 text-sm flex items-center justify-center gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
					<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
				</svg>
				GitHub
			</a>
			<a
				href="/login/42"
				class="login py-2 text-sm flex items-center justify-center gap-2">
				<span class="text-lg">🔗</span>
				42 Intra
			</a>
		</div>
	</div>
</div>
