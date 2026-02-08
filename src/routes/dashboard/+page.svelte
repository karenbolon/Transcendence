<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="flex items-center justify-center min-h-[calc(100vh-200px)] px-4 py-8">
	<div class="card text-center">
		<h1 class="game-title text-3xl mb-4">Welcome!</h1>

		<p class="text-xl mb-2">
			Hello, <strong class="text-pink-500">{data.user.username}</strong>!
		</p>
		<p class="text-gray-400 mb-6">{data.user.email}</p>

		<div class="space-y-3">
			<a href="/profile" class="sign inline-block">My Profile</a>
		</div>

		<form method="POST" action="/logout" use:enhance>
			<button type="submit" class="sign">
				Logout
			</button>
		</form>

		<!-- {#if $user}
			<img src={$user.avatar} alt="avatar" class="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-pink-500" />
			<p class="text-xl mb-2">Hello, <strong class="text-pink-500">{$user.username}</strong>!</p>
			<p class="text-gray-400 mb-6">{$user.email}</p>

			<button onclick={handleLogout} class="sign">
				Logout
			</button>
		{:else}
			<p>Not logged in</p>
			<a href="/signin" class="link">Go to login</a>
		{/if} -->
	</div>
</div>