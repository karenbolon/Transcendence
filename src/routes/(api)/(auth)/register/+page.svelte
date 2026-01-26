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
	<div class="card ">

	<div class="text-center">
		<h1 class="game-title text-4xl mb-2">Sign Up</h1>
		<p >Join the game and start playing!</p>
	</div>

	<form method="POST" class="w-full max-w-md space-y-4 p-4" use:enhance={() => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			await update();
		};
	}} >

		<!-- Global Error -->
		{#if form?.error}
			<div class="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm">
				{form.error}
			</div>
		{/if}

		<div class="form-group">
			<label for="username">Username</label>
			<input class="form-r"
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
			<input class="form-r"
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
			<!-- <p class="text-xs text-gray-400 mt-1">
				Must be 8+ characters with uppercase, lowercase, and number
			</p> -->
		</div>

		<!-- password strength indicator -->

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

		<button class="sign w-full py-3" type="submit" disabled={loading || !isFormValid}>
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

		<!-- OAuth Section (Future) -->
		<div class="sep">
			<div class="relative flex justify-center text-sm">
				<span class="px-2 bg-pong-darker text-gray-400">Or sign up with</span>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<button
				type="button"
				class="login py-2 text-sm" disabled>
				🔗 42 Intra (Coming Soon)
			</button>
			<button
			type="button"
			class="login py-2 text-sm" disabled>
				👤 OAuth (Coming Soon)
			</button>
		</div>
	</div>
</div>
