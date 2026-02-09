<script lang="ts">
	import logo from '$lib/assets/favicon.ico';
	// import { enhance } from '$app/forms';
	// import type { ActionData } from './$types';
	// import type { Serializable } from 'child_process';

	type Props = {
		user: {
			id: number;
			username: string;
			email: string;
			name: string;
			avatar: string;
		} | null;
	};

	let { user }: Props = $props();
</script>

<header>
	<div class="flex items-center justify-between px-6 py-3 border-b">
		<div class="corner-l">
			<a href="/" class="flex items-center gap-1">
				<img src={logo} alt="logo" />
				<strong>PONG</strong>
			</a>
		</div>
		<div class="corner-r">
			<!--  -->
				<button class="login">
					<a href="/login">Login</a>
				</button>
				<button class="sign">

					<a href="/register">Sign Up</a>
				</button>
			<!--  -->
		</div>
		<!-- <div class="corner-r flex items-center gap-3">
			{#if user}
				<a href="/dashboard" class="text-gray-300 hover:text-white transition-colors">
					👋 {user.username}
				</a>
				<form method="POST" action="/logout">
					<button type="submit" class="login text-sm">
						Logout
					</button>
				</form>
			{:else}
				<button class="login">
					<a href="/login">Login</a>
				</button>
				<button class="sign">
					<a href="/register">Sign Up</a>
				</button>
			{/if}
		</div> -->
	</div>
</header>