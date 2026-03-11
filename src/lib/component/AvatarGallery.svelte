<script lang="ts">
	import { _ } from 'svelte-i18n';

	// type UnlockableAvatar = {
	// 	id: string;
	// 	url: string;
	// 	name: string;
	// 	emoji: string;
	// 	hint: string;
	// 	unlocked: boolean;
	// };

	type Props = {
			name: string;
			selectedUrl: string | null;
			uploadedAvatars: string[];
			defaultAvatars: Record<string, string[]>;
			uploading: boolean;
			unlockedAvatars: string[];
			lockableAvatars: { url: string; label: string }[];
			onselect: (url: string | null) => void;
			onupload: (e: Event) => void;
			ondelete: (url: string) => void;
	};

	let {
			name,
			selectedUrl,
			uploadedAvatars,
			defaultAvatars,
			uploading,
			unlockedAvatars,
			lockableAvatars = [],
			onselect,
			onupload,
			ondelete,
	}: Props = $props();

	type Tab = 'mine' | 'collection' | 'unlockable';
	let activeTab = $state<Tab>('mine');

	let activeCategory = $state('');

	// Auto-select the first category when data arrives
	$effect(() => {
			const keys = Object.keys(defaultAvatars);
			if (keys.length > 0 && !keys.includes(activeCategory)) {
					activeCategory = keys.includes('general') ? 'general' : keys[0];
			}
	});

	function formatCategory(name: string): string {
			return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
	}
</script>

<div class="avatar-gallery">
	<!-- Tabs  -->
	<div class="tabs">
		<button
				class="tab"
				class:active={activeTab === 'mine'}
				onclick={() => { activeTab = 'mine'; }}
		>
				$_{'avatar.myAvatars'}
		</button>
		<button
				class="tab"
				class:active={activeTab === 'collection'}
				onclick={() => { activeTab = 'collection'; }}
		>
				$_{'avatar.collection'}
		</button>
		<button
				class="tab"
				class:active={activeTab === 'unlockable'}
				onclick={() => { activeTab = 'unlockable'; }}
		>
				$_{'avatar.unlockable'}
		</button>
	</div>

	<!-- Grid of avatars -->
	<div class="grid-area">
		{#if activeTab === 'mine'}
			<div class="grid">
				<button
					class="avatar-option initials-option"
					class:selected={selectedUrl === null}
					onclick={() => onselect(null)}
				>
					<span class="initials-badge">{name.charAt(0).toUpperCase()}</span>
					<span class="av-label">$_{'avatar.default'}</span>
				</button>
				{#each uploadedAvatars as url (url)}
					<div class="upload-wrapper">
						<button
							class="avatar-option uploaded-option"
							class:selected={selectedUrl === url}
							onclick={() => onselect(url)}
						>
							<img src={url} alt="Your upload" />
						</button>
						<button
							class="delete-upload"
							onclick={() => ondelete(url)}
							title="Remove photo"
						>
							&times;
						</button>
					</div>
				{/each}
				<label class="avatar-option upload-placeholder" class:disabled={uploading}>
					<input
						type="file"
						accept="image/png,image/jpeg,image/webp"
						onchange={onupload}
						disabled={uploading}
						hidden
					/>
					<span class="upload-icon">+</span>
					<span class="upload-text">$_{'avatar.upload'}</span>
				</label>
			</div>
		<!-- Collection -->
		{:else if activeTab === 'collection'}
			<div class="grid">
				{#each Object.entries(defaultAvatars) as [category, urls] (category)}
					<div class="section-divider">{formatCategory(category)} ({urls.length})</div>
					{#each urls as url (url)}
						<button
							class="avatar-option"
							class:selected={selectedUrl === url}
							onclick={() => onselect(url)}
						>
							<img src={url} alt="{category} avatar" />
						</button>
					{/each}
				{/each}
			</div>
		{:else if activeTab === 'unlockable'}
			<div class="grid">
				<!-- Unlock section -->
				 {#if unlockedAvatars.length > 0}
					<!-- how many unlock you have  -->
					<div class="section-divider">✅ $_{'avatar.unlocked'} ({unlockedAvatars.length})</div>
					<div class="section-row">
						{#each lockableAvatars as avatar (avatar.url)}
							<div class="locked-wrapper" title={avatar.label}>
								<div class="avatar-option locked-option">
									<img src={avatar.url} alt="Locked avatar" />
									<div class="lock-overlay">
										<span class="lock-icon">&#128274;</span>
									</div>
								</div>
								<span class="lock-hint">{avatar.label}</span>
							</div>
						{/each}
					</div>

				{/if}
				 <!-- Avatars that can be unlocked (shown locked) -->
				{#if lockableAvatars.length > 0}
					<div class="section-divider">🔒 Locked ({lockableAvatars.length})</div>
					<div class="section-row">
						{#each lockableAvatars as avatar (avatar.url)}
							<div class="locked-wrapper" title={avatar.label}>
								<div class="avatar-option locked-option">
									<img src={avatar.url} alt="lock-overlay" />
									<div class="lock-overlay">
										<span class="lock-icon">🔒</span>
									</div>
								</div>
								<span class="lock-hint">{avatar.label}</span>
							</div>
						{/each}
					</div>
				{/if}
				{#if unlockedAvatars.length === 0 && lockableAvatars.length === 0}
						<p class="tab-hint">$_{'avatar.description'}</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
<!-- {#each unlockable as avatar (avatar.id)}
					<button
						class="avatar-option unlockable-option"
						class:selected={selectedUrl === avatar.url}
						disabled={!avatar.unlocked}
						onclick={() => onselect(avatar.unlocked ? avatar.url : null)}
					>
						<img src={avatar.url} alt={avatar.name} />
					</button>
				{/each} -->
<style>
	/* Main tabs */
	.tabs {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding: 0.6rem 1.25rem 0;
	}

	.tab {
		flex: 1;
		padding: 0.4rem 0.5rem;
		border-radius: 0.5rem 0.5rem 0 0;
		background: transparent;
		color: #5a5a7e;
		font-family: inherit;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
		position: relative;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.tab:hover {
		color: #9ca3af;
	}

	.tab.active {
		color: #ff6b9d;
		background: rgba(255, 107, 157, 0.08);
		border-bottom: 2px solid #ff6b9d;

	}

	/* Tab content area */
	.grid-area {
		padding: 0.85rem 1.25rem 1rem;
		max-height: 240px;
		overflow-y: auto;
	}

	.grid-area::-webkit-scrollbar {
		width: 4px;
	}

	.grid-area::-webkit-scrollbar-track {
		background: transparent;
	}

	.grid-area::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.08);
		border-radius: 2px;
	}



	/* Scrollable grid for collection avatars */
	.grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.45rem;
	}

	/* Avatar options (shared) */
	.avatar-option {
		position: relative;
		aspect-ratio: 1;
		border-radius: 0.6rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.2rem;
		cursor: pointer;
		transition: all 0.2s;
		border: 2px solid transparent;
		background: rgba(255, 255, 255, 0.03);
		overflow: hidden;
		font-family: inherit;
		color: inherit;
		padding: 0;
	}

	.avatar-option:hover {
		transform: translateY(-2px);
		border-color: rgba(255, 255, 255, 0.12);
	}

	.avatar-option.selected {
		border-color: #ff6b9d;
		background: rgba(255, 107, 157, 0.06);
		box-shadow: 0 0 12px rgba(255, 107, 157, 0.15);
	}

	.avatar-option img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
	}
	.av-label {
		font-size: 0.58rem;
		color: #7a7a9e;
		text-align: center;
		line-height: 1.2;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: 0 0.15rem;
	}

	/* Uploaded avatar border */
	.uploaded-option {
			border-color: rgba(96, 165, 250, 0.3);
	}
	.upload-text {
		font-size: 0.68rem;
		color: #4b5563;
	}

	/* Earned avatar border (golden glow) */
	/* .earned-option {
			border-color: rgba(251, 191, 36, 0.4);
	}

	.earned-option.selected {
			border-color: #fbbf24;
			box-shadow: 0 0 8px rgba(251, 191, 36, 0.4);
	} */

	/* Initials */
	.initials-badge {
		width: 46px;
		height: 46px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ff6b9d, #a855f7);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		color: #fff;
		font-weight: 700;
	}

	/* Upload wrapper + delete button */
	.upload-wrapper {
			position: relative;
	}

	.delete-upload {
			position: absolute;
			top: -4px;
			right: -4px;
			width: 18px;
			height: 18px;
			border-radius: 50%;
			border: none;
			background: rgba(239, 68, 68, 0.9);
			color: white;
			font-size: 1rem;
			line-height: 1;
			padding: 0 0 2px 0;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			opacity: 0;
			transition: opacity 0.15s;
	}

	.upload-wrapper:hover .delete-upload {
			opacity: 1;
	}

	/* The "+" upload circle */
	.upload-placeholder {
			display: flex;
			align-items: center;
			justify-content: center;
			border: 2px dashed rgba(255, 255, 255, 0.15);
			cursor: pointer;
			background: none;
			transition: border-color 0.15s;
	}

	.upload-placeholder:hover {
			border-color: rgba(255, 255, 255, 0.3);
	}

	.upload-placeholder.disabled {
			opacity: 0.5;
			cursor: not-allowed;
	}

	.upload-icon {
			color: #7a7a9e;
			font-size: 1.2rem;
			font-weight: 300;
	}

	/* Locked avatars */
	.locked-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
	}

	.locked-option {
		position: relative;
		cursor: default;
		opacity: 0.45;
		filter: grayscale(100%);
	}

	.locked-option:hover {
		transform: none;
		border-color: transparent;
	}

	.lock-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(10, 10, 26, 0.4);
		border-radius: inherit;
	}

	.lock-icon {
		font-size: 0.85rem;
		filter: none;
		opacity: 0.9;
	}

	.lock-hint {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 0.12rem 0.15rem;
		background: rgba(10, 10, 26, 0.85);
		font-size: 0.4rem;
		color: #5a5a7e;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tab-hint {
		grid-column: 1 / -1;
		text-align: center;
		color: #4b5563;
		font-size: 0.75rem;
		padding: 1.5rem 0;
	}

	/* ── Scroll hint ── */
	/* .scroll-hint {
		font-size: 0.58rem;
		color: #3a3a5e;
		text-align: center;
		padding: 0.4rem 0 0;
		font-style: italic;
	} */

	/* ── Section divider ── */
	.section-divider {
		grid-column: 1 / -1;
		font-size: 0.6rem;
		color: #5a5a7e;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.35rem 0 0.1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
		margin-bottom: 0.1rem;
	}

	/* ── Responsive ── */
	@media (max-width: 400px) {
		.grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}
</style>