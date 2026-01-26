<script lang="ts">
	import { login } from '$lib/store/auth';

	let username = $state('');
	let password = $state('');
	let error = $state('');

	function handleLogin(event: Event) {
		event.preventDefault();
		error = '';


		if (!username.trim()) {
			error = 'Please enter your username';
			return;
		}

		if (!password.trim()) {
			error = 'Please enter your password';
			return;
		}

		try {
			console.log('Attempting to login:', username);

			login(username, password);

			console.log('Login successful!');

			window.location.href = '/dashboard';

		} catch (err) {

			console.error('Login error:', err);
			// error = err.message || 'Login failed';
		}
	}
</script>

<div class="flex items-center justify-center min-h-[calc(100vh-200px)] px-4 py-8">
	<div class="card ">

		<div class="text-center">
			<h1 class="game-title text-4xl mb-2">Login</h1>
			<p >Welcome back! Ready to play?</p>
		</div>
		<form class="w-full max-w-md space-y-4 p-4" onsubmit={handleLogin}>
			{#if error}
				<div class="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm">
					{error}
				</div>
			{/if}

			<div class="form-group">
				<label for="username">Username</label>
				<input class="form-r"
					type="text"
					id="username"
					name="username"
					placeholder="Enter your username"
					bind:value={username}
				/>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input class="form-r"
					type="password"
					id="password"
					name="password"
					placeholder="Enter your password"
					bind:value={password}
				/>
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


			<button class="sign w-full py-3" type="submit">Login</button>
		</form>

		<div class="text-center text-sm text-gray-400">
			Don't have an account?
			<a href="/register" class="link">Sign up</a>
		</div>

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