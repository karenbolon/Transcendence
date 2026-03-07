<script lang="ts">
	import { handleFormSubmit } from '$lib/utils/format_utils';
	import UserAvatar from '$lib/component/UserAvatar.svelte';

	type Props = {
		open: boolean;
		user: { name: string; bio: string | null; avatarUrl: string | null };
		onclose: () => void;
		onsave: (update: { name: string; bio: string | null; avatarUrl: string | null }) => void;
	};

	let { open, user, onclose, onsave }: Props = $props();

	let name = $state('');
	let bio = $state('');
	let avatarUrl: string | null = $state(null);
	let error = $state('');
	let saving = $state(false);
	let uploading = $state(false);

	let defaultAvatars: string[] = $state([]);
	let uploadedAvatarUrl: string | null = $state(null);

	$effect(() => {
		if (open) {
			name = user.name;
			bio = user.bio ?? '';
			avatarUrl = user.avatarUrl;
			error = '';

			// Keep track of existing uploaded avatar
			if (user.avatarUrl && user.avatarUrl.includes('/uploads/')) {
				uploadedAvatarUrl = user.avatarUrl;
			}

			if (defaultAvatars.length === 0) {
				fetch('/api/avatars/defaults')
					.then((r) => r.json())
					.then((urls) => { defaultAvatars = urls; })
					.catch(() => {});
			}
		}
	});

	function selectAvatar(url: string) {
		avatarUrl = url;
	}

	async function handleFileUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (file.size > 2 * 1024 * 1024) {
			error = 'Image must be 2MB or less.';
			return;
		}

		uploading = true;
		error = '';

		try {
			const formData = new FormData();
			formData.set('avatar', file);

			const res = await fetch('/api/profile/avatars', {
				method: 'POST',
				body: formData,
			});

			const result = await res.json();

			if (!res.ok) {
				error = result.error ?? 'Upload failed.';
				return;
			}

			avatarUrl = result.url;
			uploadedAvatarUrl = result.url;
		} catch {
			error = 'Upload failed. Please try again.';
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	async function handleSave() {
		error = '';

		await handleFormSubmit({
			url: '/api/profile',
			method: 'PUT',
			body: { name: name.trim(), bio: bio.trim() || null, avatarUrl },
			errorMessage: 'Failed to save profile.',
			validate: () => {
				if (!name.trim()) return 'Name is required.';
				if (name.trim().length > 100) return 'Name must be 100 characters or less.';
				if (bio.length > 300) return 'Bio must be 300 characters or less.';
			},
			onSuccess: (result) => {
				const u = result.user as { name: string; bio: string | null; avatarUrl: string | null };
				onsave({ name: u.name, bio: u.bio, avatarUrl: u.avatarUrl });
				onclose();
			},
			onError: (msg) => { error = msg; },
			onLoading: (v) => { saving = v; },
		});
	}

	function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape') onclose();
	}

	function handleBackdropClick() {
		if (!saving && !uploading) onclose();
	}

</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={handleBackdropClick}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2 class="modal-title">Edit Profile</h2>
				<button class="modal-close" onclick={onclose} disabled={saving}>&times;</button>
			</div>
			<div class="modal-body">
				<!-- Avatar section -->
				<div class="avatar-section">
					<span class="field-label">Avatar</span>
					<div class="avatar-preview">
						<UserAvatar username={name} displayName={name} avatarUrl={avatarUrl} size="xl" />
					</div>

					<div class="avatar-gallery">
						<button
							class="avatar-option initials-option"
							class:selected={avatarUrl === null}
							onclick={() => { avatarUrl = null; }}
						>
							<span class="initials-badge">{name.charAt(0).toUpperCase()}</span>
						</button>
						{#if uploadedAvatarUrl}
							<button
								class="avatar-option uploaded-option"
								class:selected={avatarUrl === uploadedAvatarUrl}
								onclick={() => { avatarUrl = uploadedAvatarUrl; }}
							>
								<img src={uploadedAvatarUrl} alt="Your upload" />
							</button>
						{/if}
						{#each defaultAvatars as url}
							<button
								class="avatar-option"
								class:selected={avatarUrl === url}
								onclick={() => selectAvatar(url)}
							>
								<img src={url} alt="Default avatar" />
							</button>
						{/each}
					</div>

					<label class="upload-btn" class:disabled={uploading}>
						<input
							type="file"
							accept="image/png,image/jpeg,image/webp"
							onchange={handleFileUpload}
							disabled={uploading}
							hidden
						/>
						{uploading ? 'Uploading...' : 'Upload custom image'}
					</label>
				</div>

				<!-- Name field -->
				<div class="field">
					<label class="field-label" for="edit-name">Display Name</label>
					<input
						id="edit-name"
						type="text"
						class="field-input"
						bind:value={name}
						maxlength={100}
						disabled={saving}
						placeholder="Your display name"
					/>
				</div>
				<!-- Bio field -->
				<div class="field">
					<label class="field-label" for="edit-bio">Bio</label>
					<textarea
						id="edit-bio"
						class="field-input field-textarea"
						bind:value={bio}
						maxlength={300}
						disabled={saving}
						placeholder="Tell others about yourself..."
						rows={3}
					></textarea>
					<span class="char-count">{bio.length}/300</span>
				</div>
				{#if error}
					<p class="modal-error">{error}</p>
				{/if}
			</div>
			<div class="modal-actions">
				<button
					class="modal-btn modal-btn--cancel"
					onclick={handleBackdropClick}
					disabled={saving}
				>
					Cancel
				</button>
				<button
					class="modal-btn modal-btn--save"
					onclick={handleSave}
					disabled={saving || uploading}
				>
					{saving ? 'Saving...' : 'Save Changes'}
				</button>
			</div>
		</div>
	</div>
{/if}


<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(10, 10, 26, 0.75);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fade-in 0.15s ease-out;
	}

	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

	.modal {
		width: 100%;
		max-width: 580px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(145deg, #181840, #12122e);
		border: 1px solid rgba(255, 107, 157, 0.12);
		border-radius: 1.1rem;
		padding: 1.75rem;
		overflow-y: hidden;
		box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 107, 157, 0.05);
		animation: modal-in 0.25s ease-out;
		/* animation: scaleIn 0.15s ease; */
	}

	@keyframes modal-in {
		from { opacity: 0; transform: scale(0.95) translateY(10px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.1rem 1.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		flex-shrink: 0;
		/* margin-bottom: 1.25rem; */
	}

	.modal-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: #f3f4f6;
		margin: 0;
	}

	.modal-close {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.06);
		color: #7a7a9e;
		font-size: 1.25rem;
		line-height: 1;
		padding: 0 0 2px 0;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
	}

	.modal-close:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #d1d5db;
	}

	.modal-body {
		padding: 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		overflow-y: auto;
		flex: 1;
	}

	/* Avatar section */
	.avatar-section {
		margin-bottom: 1.25rem;
	}

	.avatar-preview {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		margin: 0.5rem auto 0.75rem;
		overflow: hidden;
		border: 3px solid rgba(255, 107, 157, 0.3);
	}

	.avatar-gallery {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
		margin-bottom: 0.75rem;
	}

	.avatar-option {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		padding: 0;
		background: none;
		overflow: hidden;
		transition: border-color 0.15s, transform 0.15s;
	}

	.avatar-option:hover {
		border-color: rgba(255, 255, 255, 0.3);
		transform: scale(1.1);
	}

	.avatar-option.selected {
		border-color: #ff6b9d;
		box-shadow: 0 0 8px rgba(255, 107, 157, 0.4);
	}

	.avatar-option img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.uploaded-option {
		border-color: rgba(96, 165, 250, 0.3);
	}

	.initials-badge {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #ff6b9d, #c084fc);
		color: #fff;
		font-size: 1.1rem;
		font-weight: 700;
		border-radius: 50%;
	}

	.upload-btn {
		display: block;
		text-align: center;
		padding: 0.45rem 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: #9ca3af;
		border: 1px dashed rgba(255, 255, 255, 0.15);
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}

	.upload-btn:hover {
		border-color: rgba(255, 255, 255, 0.3);
		color: #d1d5db;
	}

	.upload-btn.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Form fields */
	.field {
		margin-bottom: 1rem;
		position: relative;
	}

	.field-label {
		display: block;
		font-size: 0.85rem;
		margin-bottom: 0.4rem;

		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: #7a7a9e;
		font-weight: 600;
		padding-top: 0.25rem;
	}

	.field-input {
		width: 100%;
		padding: 0.6rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);
		color: #f3f4f6;
		font-size: 0.9rem;
		outline: none;
		box-sizing: border-box;
		transition: border-color 0.15s;
	}

	.field-input:focus {
		border-color: rgba(255, 107, 157, 0.5);
	}

	.field-input:disabled {
		opacity: 0.5;
	}

	.field-textarea {
		resize: vertical;
		min-height: 70px;
		font-family: inherit;
	}

	.char-count {
		position: absolute;
		bottom: 0.5rem;
		right: 0.75rem;
		font-size: 0.7rem;
		color: #4b5563;
	}

	/* Action */
	.modal-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.modal-btn {
		flex: 1;
		padding: 0.6rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		border: none;
		transition: background 0.15s, opacity 0.15s;
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

	.modal-btn--save {
		background: #ff6b9d;
		color: white;
	}

	.modal-btn--save:hover:not(:disabled) {
		background: #ff8db5;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes scaleIn {
		from { transform: scale(0.95); opacity: 0; }
		to { transform: scale(1); opacity: 1; }
	}
</style>