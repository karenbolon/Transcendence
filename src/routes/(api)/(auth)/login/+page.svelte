<script lang="ts">
	import { enhance } from '$app/forms';
	import type { LoginFormResult } from '$lib/types/form';
	import { validateUsername } from '$lib/validation/frontend';
	import PasswordInput from '$lib/component/PasswordInput.svelte';

	let { form }: { form: LoginFormResult | null } = $props();
	
	let loading = $state(false);
	let username = $state('');
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
		if (password.length < 1) return 'Password is required';
		return '';
	});

	let isFormValid = $derived(
		username.length >= 3 && password.length >= 1
	);

</script>

<div class="flex items-center justify-center min-h-[calc(100vh-200px)] px-4 py-8">
	<div class="card ">

		<div class="text-center">
			<h1 class="game-title text-4xl mb-2">Login</h1>
			<p >Welcome back! Ready to play?</p>
		</div>
		<form method="POST" class="w-full max-w-md space-y-4 p-4" use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}>
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
					placeholder="Enter your username"
					required
					bind:value={username}
					onfocusout={() => touched.username = true}
				/>
				{#if usernameError}
					<p class="text-red-400 text-sm mt-1">{usernameError}</p>
				{/if}
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<PasswordInput
					id="password"
					name="password"
					placeholder="Enter your password"
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
					Remember Me
				</label>
				<a href=/forgot-password class="link text-sm">
					Forgot password?
				</a>
			</div>


			<button class="sign w-full py-3" type="submit" disabled={loading || !isFormValid}>
				{#if loading}
					Logging in...
				{:else}
					Login
				{/if}
			</button>
		</form>

		<div class="text-center text-sm text-gray-400">
			Don't have an account?
			<a href="/register" class="link">Sign up</a>
		</div>

			<!-- coming soon -->
		<div class="sep">
			<div class="relative flex justify-center text-sm">
				<span class="px-2 bg-pong-darker text-gray-400">Or continue with</span>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<button
				type="button"
				class="btn-secondary py-2 text-sm">
				🔗 42 Intra
			</button>
			<button
			type="button"
			class="btn-secondary py-2 text-sm">
				👤 OAuth
			</button>
		</div>
	</div>
</div>