<script lang="ts">
	import { login } from '$lib/store/auth';
	import { t } from 'svelte-i18n';

	let username = $state('');
	let password = $state('');
	let errorKey = $state<string | null>(null);

	function handleLogin(event: Event) {
		event.preventDefault();
		


		if (!username.trim()) {
			errorKey = 'auth.errors.username_required';
			return;
		}

		if (!password.trim()) {
			errorKey = 'auth.errors.password_required';
			return;
		}

		try {
			console.log('Attempting to login:', username);

			login(username, password);

			console.log('Login successful!');

			window.location.href = '/dashboard';

		} catch (err) {

			console.error('Login error:', err);
			errorKey = 'auth.errors.login_failed';
		}
	}
</script>

<div class="flex items-center justify-center min-h-[calc(100vh-200px)] px-4 py-8">
	<div class="card ">

		<div class="text-center">
			<h1 class="game-title text-4xl mb-2">{$t('auth.login.title')}</h1>
			<p>{$t('auth.login.subtitle')}</p>
		</div>

		<form class="w-full max-w-md space-y-4 p-4" onsubmit={handleLogin}>
			{#if errorKey}
				<div class="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm">
					{$t(errorKey)}
				</div>
			{/if}

			<div class="form-group">
				<label for="username">{$t('auth.fields.username')}</label>
				<input class="form-r"
					type="text"
					id="username"
					name="username"
					placeholder={$t('auth.placeholders.username')}
					bind:value={username}
				/>
			</div>
			
			<div class="form-group">
				<label for="password">{$t('auth.fields.password')}</label>
				<input class="form-r"
					type="password"
					id="password"
					name="password"
					placeholder={$t('auth.placeholders.password')}
					bind:value={password}
				/>
			</div>

			<div class="flex items-center justify-between text-sm">
				<label >
					<input type="checkbox" name="rememberMe" />
					{$t('auth.login.remember_me')}
				</label>
				<a href=/forgot-password class="link text-sm">
					{$t('auth.login.forgot_password')}
				</a>
			</div>
			

			<button class="sign w-full py-3" type="submit">
				{$t('auth.login.submit')}
			</button>
		</form>

		<div class="text-center text-sm text-gray-400">
			{$t('auth.login.no_account')}
			<a href="/register" class="link">{$t('auth.login.signup_link')}</a>
		</div>

		<div class="sep">
			<div class="relative flex justify-center text-sm">
				<span class="px-2 bg-pong-darker text-gray-400">
					{$t('auth.login.continue_with')}</span>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<button
				type="button"
				class="btn-secondary py-2 text-sm">
					{$t('oath_42')}
			</button>
			<button
			type="button"
			class="btn-secondary py-2 text-sm">
				{$t('oauth')}
			</button>
		</div>
	</div>
</div>