<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	// Get form data from server
	export let form: ActionData;

	let loading = false;
	// import { register } from '$lib/store/auth';

	// let username = $state('');
	// let email = $state('');
	// let password = $state('');
	// let confirmPassword = $state('');
	// let acceptedTerms = $state(false);

	// let error = $state('');


	// function handleRegister(event: Event) {
	// 	event.preventDefault();

	// 	error = '';
	// 	if (!username.trim()) {

	// 		error = 'Please enter a username';
	// 		return;
	// 	}

	// 	if (!email.trim()) {
	// 		error = 'Please enter an email';
	// 		return;
	// 	}

	// 	if (!password.trim()) {
	// 		error = 'Please enter a password';
	// 		return;
	// 	}

	// 	if (password !== confirmPassword) {
	// 		error = 'Passwords do not match';
	// 		return;
	// 	}

	// 	if (!acceptedTerms) {
	// 		error = 'You must accept the terms and conditions';
	// 		return;
	// 	}

	// 	register(username, email, password);

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

		<!-- Success Message -->
		{#if form?.success}
			<div class="bg-green-500/10 border border-green-500 text-green-500 px-4 py-2 rounded-lg text-sm">
				Account created! Redirecting...
			</div>
		{/if}


		<div class="form-group">
			<label for="username">Username</label>
			<input class="form-r"
				type="text"
				id="username"
				name="username"
				placeholder="Choose a username"
				required
			/>
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
			/>
			{#if form?.errors?.email}
				<p class="text-red-500 text-sm mt-1">{form.errors.email}</p>
			{/if}
		</div>

		<div class="form-group">
			<label for="password">Password</label>
			<input class="form-r"
				type="password"
				id="password"
				name="password"
				placeholder="Create a password"
				required
			/>
			{#if form?.errors?.password}
				<p class="text-red-500 text-sm mt-1">{form.errors.password}</p>
			{/if}
			<p class="text-xs text-gray-400 mt-1">
				Must be 8+ characters with uppercase, lowercase, and number
			</p>
		</div>

		<div class="form-group">
			<label for="confirmPassword">Confirm Password</label>
			<input class="form-r"
				type="password"
				id="confirmPassword"
				name="confirmPassword"
				placeholder="Re-enter your password"
				required
			/>
			{#if form?.errors?.confirmPassword}
				<p class="text-red-500 text-sm mt-1">{form.errors.confirmPassword}</p>
			{/if}
		</div>

		<div >
			<label >
				<input type="checkbox" name="acceptTerms" required />
				I agree to the <a href="/terms" class="link" target="_blank">Terms of Service</a> and
				<a href="/privacy" class="link" target="_blank">Privacy Policy</a>
			</label>
			<p class="text-[0.65rem] text-gray-400">
				We use your email and username to create and secure your accounts. 
				No tracking or analytics cookies are used.
			</p>
		</div>

		<button class="sign w-full py-3" type="submit" disabled={loading}>
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



<!--
    {#if error}
      <div class="bg-pong-accent/20 border border-pong-accent rounded-lg p-3">
        <p class="text-pong-accent text-sm">{error}</p>
      </div>
    {/if}

    <form method="POST" use:enhance={handleSubmit} class="space-y-4">

      <div class="space-y-2">
        <label for="username" class="block text-sm font-medium text-gray-300">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          placeholder="Choose a username"
          class="input"
          disabled={loading}
          minlength="3"
          maxlength="20"
          pattern="[a-zA-Z0-9_]+"
          title="Username can only contain letters, numbers, and underscores"
        />
        <p class="text-xs text-gray-400">3-20 characters, letters, numbers, and underscores only</p>
      </div>

      <div class="space-y-2">
        <label for="email" class="block text-sm font-medium text-gray-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="your.email@example.com"
          class="input"
          disabled={loading}
        />
      </div>

      <div class="space-y-2">
        <label for="displayName" class="block text-sm font-medium text-gray-300">
          Display Name <span class="text-gray-500">(Optional)</span>
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          placeholder="How should we call you?"
          class="input"
          disabled={loading}
          maxlength="50"
        />
      </div>

      <div class="space-y-2">
        <label for="password" class="block text-sm font-medium text-gray-300">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="Create a strong password"
          class="input"
          disabled={loading}
          minlength="6"
          on:input={checkPasswordStrength}
        />
        {#if passwordStrength}
          <div class="flex gap-1">
            <div class="h-1 flex-1 rounded-full {passwordStrength === 'weak' ? 'bg-pong-accent' : passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}"></div>
            <div class="h-1 flex-1 rounded-full {passwordStrength === 'medium' || passwordStrength === 'strong' ? (passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-600'}"></div>
            <div class="h-1 flex-1 rounded-full {passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-600'}"></div>
          </div>
          <p class="text-xs {passwordStrength === 'weak' ? 'text-pong-accent' : passwordStrength === 'medium' ? 'text-yellow-500' : 'text-green-500'}">
            Password strength: {passwordStrength}
          </p>
        {/if}
      </div>

      <div class="space-y-2">
        <label for="confirmPassword" class="block text-sm font-medium text-gray-300">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          placeholder="Re-enter your password"
          class="input"
          disabled={loading}
        />
      </div>

      <div class="space-y-2">
        <label class="flex items-start gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            class="w-4 h-4 mt-0.5 rounded border-pong-purple/30 bg-pong-darker text-pong-pink focus:ring-pong-pink"
          />
          <span>
            I agree to the <a href="/terms" class="link" target="_blank">Terms of Service</a>
            and <a href="/privacy" class="link" target="_blank">Privacy Policy</a>
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        class="btn-primary w-full py-3"
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
    </form-->