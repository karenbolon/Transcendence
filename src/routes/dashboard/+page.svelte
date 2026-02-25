<script lang="ts">
	import type { PageData } from "./$types";
	import Logout from "$lib/component/Logout.svelte";
	import XpBar from "$lib/component/progression/XpBar.svelte";
	import LevelBadge from "$lib/component/progression/LevelBadge.svelte";

	let { data }: { data: PageData } = $props();
</script>

<div
	class="flex items-center justify-center min-h-[calc(100vh-200px)] px-4 py-8"
>
	<div class="container text-center">
		<h1 class="brand-name text-3xl mb-4">Welcome!</h1>

		<p class="text-xl mb-2">
			Hello, <strong class="text-pink-500">{data.user.username}</strong>!
		</p>
		<p class="text-gray-400 mb-6">{data.user.email}</p>

		<!-- Progression Section -->
		{#if data.progression}
			<div class="progression-section">
				<LevelBadge level={data.progression.level} size="lg" />
				<div class="xp-bar-wrapper">
					<XpBar
						currentXp={data.progression.currentXp}
						xpToNextLevel={data.progression.xpToNextLevel}
						level={data.progression.level}
					/>
				</div>
			</div>
		{:else}
			<p class="text-gray-500 text-sm mb-4">
				Play a match to start earning XP!
			</p>
		{/if}

		<div class="space-y-3">
			<a href="/profile" class="btn-login inline-block">My Profile</a>
			<a href="/achievements" class="btn-login inline-block"
				>Achievements</a
			>
		</div>

		<Logout class="btn-signup" />
	</div>
</div>

<style>
	.progression-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		max-width: 350px;
		margin-left: auto;
		margin-right: auto;
	}

	.xp-bar-wrapper {
		width: 100%;
	}
</style>
