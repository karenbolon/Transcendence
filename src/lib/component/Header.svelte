<script lang="ts">
	import logo from '$lib/assets/favicon.ico';
	import LanguageSwitcher from '$lib/component/LanguageSwitcher.svelte';
	import { locale } from 'svelte-i18n';

</script>

<header>
	<div class="flex items-center justify-between px-6 py-3 border-b">
		<div class="corner-l">
				<img src={logo} alt="logo" />
				<strong>PONG</strong>
		</div>
		<div class="corner-r flex items-center gap-4">
			<!-- Language switcher -->
			 <LanguageSwitcher />
			 
			<!--  -->
				<button class="login">
					<a href="/login">Login</a>
				</button>
				<button class="sign">

					<a href="/register">Sign Up</a>
				</button>
			<!--  -->
		</div>
	</div>
</header>