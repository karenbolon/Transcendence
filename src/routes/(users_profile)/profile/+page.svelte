<script lang="ts">
	import Logout from "$lib/component/Logout.svelte";
	import XpBar from "$lib/component/progression/XpBar.svelte";
	import LevelBadge from "$lib/component/progression/LevelBadge.svelte";
	import AchievementCard from "$lib/component/progression/AchievementCard.svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	// ── DELETE MODAL STATE ──────────────────────────────────────
	let showDeleteModal = $state(false);
	let deletePassword = $state("");
	let deleteError = $state("");
	let isDeleting = $state(false);

	// ── HELPER FUNCTIONS ───────────────────────────────────────

	// Format a date for display
	function formatDate(date: Date | string): string {
		const d = new Date(date);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return "Just now";
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;

		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	}

	// Format duration (seconds → "1m 23s")
	function formatDuration(seconds: number | null): string {
		if (!seconds) return "—";
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return m > 0 ? `${m}m ${s}s` : `${s}s`;
	}

	// Format game mode for display
	function formatMode(mode: string): string {
		switch (mode) {
			case "local":
				return "Local Player";
			case "computer":
				return "vs Computer";
			case "remote":
				return "Online";
			default:
				return mode;
		}
	}

	// Speed preset emoji
	function speedEmoji(preset: string): string {
		switch (preset) {
			case "chill":
				return "🐢";
			case "normal":
				return "🏓";
			case "fast":
				return "🔥";
			default:
				return "";
		}
	}

	// Format join date
	function formatJoinDate(date: Date | string): string {
		return new Date(date).toLocaleDateString("en-US", {
			month: "long",
			year: "numeric",
			day: "numeric",
		});
	}
</script>

<div class="profile-page max-w-4xl mx-auto px-4 py-8">
	<section class="user-info">
		<div class="avatar relative">
			<div class="avatar-circle">
				{#if data.user.avatarUrl}
					<img
						src={data.user.avatarUrl}
						alt="Avatar"
						class="avatar-img"
					/>
				{:else}
					<span class="avatar-initial"
						>{data.user.username[0].toUpperCase()}</span
					>
				{/if}
			</div>
			{#if data.user.isOnline === false}
				<span class="absolute bottom-2 right-2 w-4 h-4">🔴</span>
			{:else}
				<span class="absolute bottom-2 right-2 w-4 h-4">🟢</span>
			{/if}
		</div>
		<div class="user-details">
			<h1 class="username">{data.user.username}</h1>
			<p class="email">{data.user.email}</p>
			<p class="join-date">
				Member since {formatJoinDate(data.user.createdAt)}
			</p>
		</div>
	</section>
	<section class="user-actions">
		<a href="/profile/edit" class="action-btn">Edit Profile</a>
		<a href="/settings" class="action-btn">Settings</a>
		<Logout class="action-btn" />
		<button
			class="action-btn action-btn--danger"
			onclick={() => (showDeleteModal = true)}>Delete Account</button
		>
	</section>

	<!-- User Information, bio, etc -->
	<section class="user-information"></section>

	<!-- ═══════════════════════════════════════════════════════════
	     STATS CARDS
	═══════════════════════════════════════════════════════════ -->
	<section class="stats-grid">
		<div class="stat-card">
			<span class="stat-value">{data.stats.totalGames}</span>
			<span class="stat-label">Games</span>
		</div>
		<div class="stat-card">
			<span class="stat-value wins">{data.stats.wins}</span>
			<span class="stat-label">Wins</span>
		</div>
		<div class="stat-card">
			<span class="stat-value losses">{data.stats.losses}</span>
			<span class="stat-label">Losses</span>
		</div>
		<div class="stat-card">
			<span class="stat-value rate">{data.stats.winRate}%</span>
			<span class="stat-label">Win Rate</span>
		</div>
		<!-- <div class="stat-card">
			<span class="stat-value best">{data.stats.bestScore}</span>
			<span class="stat-label">Best Score</span>
		</div> -->
	</section>

	<!-- Progression Section -->
	{#if data.progression}
		<section class="progression-section">
			<div class="progression-header">
				<LevelBadge level={data.progression.level} size="lg" />
			</div>
			<XpBar
				currentXp={data.progression.currentXp}
				xpToNextLevel={data.progression.xpToNextLevel}
				level={data.progression.level}
			/>
			<div class="progression-stats">
				<span class="mini-stat"
					>🔥 Streak: {data.progression.currentWinStreak}</span
				>
				<span class="mini-stat"
					>⭐ Best: {data.progression.bestWinStreak}</span
				>
			</div>
		</section>
	{/if}

	<!-- Achievements -->
	<section class="user-achievements">
		<div class="section-header">
			<h2 class="section-title">Achievements</h2>
			<a href="/achievements" class="view-all-link">View all →</a>
		</div>
		{#if data.achievements && data.achievements.length > 0}
			<div class="achievements-grid">
				{#each data.achievements.slice(0, 6) as ach}
					<AchievementCard
						id={ach.id}
						name={ach.name}
						description={ach.description}
						tier={ach.tier}
						icon={ach.icon}
						unlockedAt={ach.unlockedAt}
					/>
				{/each}
			</div>
		{:else}
			<p class="empty-achievements">
				No achievements yet. Play matches to unlock them!
			</p>
		{/if}
	</section>

	<!-- ═══════════════════════════════════════════════════════════
	     MATCH HISTORY
	═══════════════════════════════════════════════════════════ -->
	<section class="match-history">
		<h2 class="section-title">Match History</h2>

		{#if data.matches.length === 0}
			<div class="empty-state">
				<h3>No matches yet!</h3>
				<p>Play your first game to see your match history here.</p>
				<a href="/play" class="play-link"
					>🎮 Play Now your first game →</a
				>
			</div>
		{:else}
			<div class="matches-list">
				{#each data.matches as match}
					<div
						class="match-row"
						class:won={match.won}
						class:lost={!match.won}
					>
						<!-- Result indicator -->
						<span class="match-result">
							{match.won ? "✅" : "❌"}
						</span>

						<!-- Score -->
						<span class="match-score">
							<span class="user-score">{match.userScore}</span>
							<span class="score-divider">–</span>
							<span class="opponent-score"
								>{match.opponentScore}</span
							>
						</span>

						<!-- Opponent -->
						<span class="match-opponent">{match.opponentName}</span>

						<!-- Mode + Speed -->
						<span class="match-mode"
							>{formatMode(match.gameMode)}</span
						>
						<span class="match-speed"
							>{speedEmoji(match.speedPreset)}</span
						>

						<!-- Duration -->
						<span class="match-duration"
							>{formatDuration(match.durationSeconds)}</span
						>

						<!-- When -->
						<span class="match-time"
							>{formatDate(match.playedAt)}</span
						>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- ═══════════════════════════════════════════════════════════
	     DELETE ACCOUNT CONFIRMATION MODAL
	═══════════════════════════════════════════════════════════ -->
	{#if showDeleteModal}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="modal-backdrop"
			onclick={() => {
				if (!isDeleting) showDeleteModal = false;
			}}
		>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<h2 class="modal-title">⚠️ Delete Account</h2>
				<p class="modal-desc">
					This action is <strong>permanent</strong>. Your account,
					profile, and stats will be removed. Your match history will
					be preserved for other players.
				</p>

				<form
					method="POST"
					action="/account/delete"
					onsubmit={async (e) => {
						e.preventDefault();
						deleteError = "";

						if (!deletePassword.trim()) {
							deleteError = "Password is required.";
							return;
						}

						isDeleting = true;
						try {
							const formData = new FormData();
							formData.set("password", deletePassword);

							const res = await fetch("/account/delete", {
								method: "POST",
								body: formData,
							});

							if (res.redirected) {
								window.location.href = res.url;
								return;
							}

							if (!res.ok) {
								const result = await res.json();
								deleteError =
									result?.data?.error ??
									"Failed to delete account.";
							} else {
								window.location.href = "/";
							}
						} catch {
							deleteError =
								"Something went wrong. Please try again.";
						} finally {
							isDeleting = false;
						}
					}}
				>
					<label class="modal-label" for="delete-password"
						>Enter your password to confirm:</label
					>
					<input
						id="delete-password"
						type="password"
						name="password"
						class="modal-input"
						placeholder="Your password"
						bind:value={deletePassword}
						disabled={isDeleting}
						autocomplete="current-password"
					/>

					{#if deleteError}
						<p class="modal-error">{deleteError}</p>
					{/if}

					<div class="modal-actions">
						<button
							type="button"
							class="modal-btn modal-btn--cancel"
							onclick={() => (showDeleteModal = false)}
							disabled={isDeleting}
						>
							Cancel
						</button>
						<button
							type="submit"
							class="modal-btn modal-btn--delete"
							disabled={isDeleting}
						>
							{isDeleting ? "Deleting..." : "Delete My Account"}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>

<style>
	.profile-page {
		max-width: 700px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	/* ═════════════════════════════════════════════════
	   USER INFO
	   ═════════════════════════════════════════════════ */
	.user-info {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.avatar-circle {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ff6b9d, #c084fc);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		overflow: hidden;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-initial {
		color: white;
		font-size: 2rem;
		font-weight: 700;
	}

	.user-details {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.username {
		font-size: 1.5rem;
		font-weight: 700;
		color: #f3f4f6;
		margin: 0;
	}

	.email {
		color: #9ca3af;
		font-size: 0.9rem;
		margin: 0;
	}

	.join-date {
		color: #6b7280;
		font-size: 0.8rem;
		margin: 0;
	}

	/* ═════════════════════════════════════════════════
	   USER ACTIONS ROW
	   ═════════════════════════════════════════════════ */
	.user-actions {
		display: flex;
		gap: 0.5rem;
	}

	.user-actions :global(.action-btn) {
		flex: 1;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		font-weight: 500;
		text-align: center;
		text-decoration: none;
		cursor: pointer;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);
		color: #d1d5db;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.user-actions :global(.action-btn:hover) {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.user-actions :global(.action-btn--danger) {
		color: #f87171;
		border-color: rgba(248, 113, 113, 0.2);
	}

	.user-actions :global(.action-btn--danger:hover) {
		background: rgba(248, 113, 113, 0.1);
		border-color: rgba(248, 113, 113, 0.4);
	}

	/* ═════════════════════════════════════════════════
	   STATS GRID
	   ═════════════════════════════════════════════════ */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
	}

	.stat-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		padding: 1rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #f3f4f6;
	}

	.stat-value.wins {
		color: #4ade80;
	}

	.stat-value.losses {
		color: #f87171;
	}

	.stat-value.rate {
		color: #ff6b9d;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* ═════════════════════════════════════════════════
	   MATCH HISTORY
	   ═════════════════════════════════════════════════ */
	.section-title {
		font-size: 1.1rem;
		font-weight: 600;
		color: #d1d5db;
		margin: 0 0 0.75rem 0;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: #6b7280;
	}

	.play-link {
		color: #ff6b9d;
		text-decoration: none;
		font-weight: 500;
	}

	.play-link:hover {
		text-decoration: underline;
	}

	.matches-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.match-row {
		display: grid;
		grid-template-columns: 30px 70px 1fr 100px 30px 60px 70px;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.75rem;
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid transparent;
		font-size: 0.85rem;
	}

	.match-row.won {
		border-color: rgba(74, 222, 128, 0.08);
	}

	.match-row.lost {
		border-color: rgba(248, 113, 113, 0.08);
	}

	.match-result {
		font-size: 0.9rem;
	}

	.match-score {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-weight: 600;
	}

	.user-score {
		color: #f3f4f6;
	}

	.score-divider {
		color: #4b5563;
	}

	.opponent-score {
		color: #9ca3af;
	}

	.match-opponent {
		color: #d1d5db;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.match-mode {
		color: #6b7280;
		font-size: 0.75rem;
	}

	.match-speed {
		text-align: center;
	}

	.match-duration {
		color: #6b7280;
		font-size: 0.8rem;
		text-align: right;
	}

	.match-time {
		color: #4b5563;
		font-size: 0.75rem;
		text-align: right;
	}

	/* ═════════════════════════════════════════════════
	   RESPONSIVE
	   ═════════════════════════════════════════════════ */
	@media (max-width: 640px) {
		.user-actions {
			flex-wrap: wrap;
		}

		.user-actions :global(.action-btn) {
			flex: 1 1 calc(50% - 0.25rem);
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.match-row {
			grid-template-columns: 28px 60px 1fr 60px;
			font-size: 0.8rem;
		}

		.match-mode,
		.match-speed,
		.match-duration {
			display: none;
		}
	}

	/* ═════════════════════════════════════════════════
	   PROGRESSION SECTION
	   ═════════════════════════════════════════════════ */
	.progression-section {
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.progression-header {
		display: flex;
		justify-content: center;
	}

	.progression-stats {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.mini-stat {
		font-size: 0.75rem;
		color: #6b7280;
	}

	/* ═════════════════════════════════════════════════
	   ACHIEVEMENTS SECTION
	   ═════════════════════════════════════════════════ */
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.section-header .section-title {
		margin: 0;
	}

	.view-all-link {
		font-size: 0.8rem;
		color: #ff6b9d;
		text-decoration: none;
	}

	.view-all-link:hover {
		text-decoration: underline;
	}

	.achievements-grid {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.empty-achievements {
		color: #6b7280;
		font-size: 0.85rem;
		text-align: center;
		padding: 1rem;
	}

	/* ═════════════════════════════════════════════════
	   DELETE ACCOUNT MODAL
	   ═════════════════════════════════════════════════ */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fadeIn 0.15s ease;
	}

	.modal {
		background: #1f2937;
		border: 1px solid rgba(248, 113, 113, 0.2);
		border-radius: 1rem;
		padding: 2rem;
		max-width: 420px;
		width: 90%;
		animation: scaleIn 0.15s ease;
	}

	.modal-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: #f87171;
		margin: 0 0 0.75rem 0;
	}

	.modal-desc {
		color: #9ca3af;
		font-size: 0.9rem;
		line-height: 1.5;
		margin: 0 0 1.25rem 0;
	}

	.modal-label {
		display: block;
		color: #d1d5db;
		font-size: 0.85rem;
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.modal-input {
		width: 100%;
		padding: 0.65rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);
		color: #f3f4f6;
		font-size: 0.9rem;
		outline: none;
		box-sizing: border-box;
		transition: border-color 0.15s;
	}

	.modal-input:focus {
		border-color: rgba(248, 113, 113, 0.5);
	}

	.modal-input:disabled {
		opacity: 0.5;
	}

	.modal-error {
		color: #f87171;
		font-size: 0.8rem;
		margin: 0.5rem 0 0 0;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	.modal-btn {
		flex: 1;
		padding: 0.6rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		border: none;
		transition:
			background 0.15s,
			opacity 0.15s;
	}

	.modal-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.modal-btn--cancel {
		background: rgba(255, 255, 255, 0.08);
		color: #d1d5db;
	}

	.modal-btn--cancel:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.12);
	}

	.modal-btn--delete {
		background: #dc2626;
		color: white;
	}

	.modal-btn--delete:hover:not(:disabled) {
		background: #b91c1c;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes scaleIn {
		from {
			transform: scale(0.95);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>
