<script lang="ts">
	import { untrack } from 'svelte';
	import { handleFormSubmit } from '$lib/utils/format_utils';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/component/Modal.svelte';
	import '$lib/styles/modal.css';
	import UserAvatar from './UserAvatar.svelte';
	import AvatarGallery from './AvatarGallery.svelte';

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

	// let defaultAvatars: string[] = $state([]);
	let defaultAvatars: Record<string, string[]> = $state({})
	let uploadedAvatarUrl: string[] = $state([]);

	// Only track `open` — use untrack for reads/writes so the effect
	// doesn't re-fire when `user` props or local state change.
	$effect(() => {
		if (open) {
			untrack(() => {
				name = user.name;
				bio = user.bio ?? '';
				avatarUrl = user.avatarUrl;
				error = '';

				// Fetch uploaded avatars for this user
				fetch('/api/profile/avatars/uploads')
					.then((r) => r.json())
					.then((urls) => { uploadedAvatarUrl = urls; })
					.catch(() => { uploadedAvatarUrl = []; });

				// old version defaultAvatars.length === 0
				if (Object.keys(defaultAvatars).length === 0) {
					fetch('/api/avatars/defaults')
						.then((r) => r.json())
						.then((urls) => { defaultAvatars = urls; })
						.catch(() => {});
				}
			});
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
			let result;
			try {
				result = await res.json();
			} catch {
				error = 'Invalid server response.';
				return;
			}
			if (!res.ok) {
				error = result.error ?? 'Upload failed.';
				return;
			}
			avatarUrl = result.url;
			const res2 = await fetch('/api/profile/avatars/uploads');
			uploadedAvatarUrl = await res2.json();
		} catch {
			error = 'Upload failed. Please try again.';
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	async function handleDeleteUpload(url: string) {
		try {
			const res = await fetch('/api/profile/avatars/uploads', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url }),
			});
			if (res.ok) {
				uploadedAvatarUrl = uploadedAvatarUrl.filter(u => u !== url);
				// If the deleted avatar was selected, fall back to initials
				if (avatarUrl === url) {
					avatarUrl = null;
				}
			}
		} catch {
			error = 'Failed to delete image.';
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
				invalidateAll();
				onclose();
			},
			onError: (msg) => { error = msg; },
			onLoading: (v) => { saving = v; },
		});
	}

</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<Modal {open} {onclose} closeable={!saving && !uploading}>
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

				<AvatarGallery
					{name}
					selectedUrl={avatarUrl}
					uploadedAvatars={uploadedAvatarUrl}
					defaultAvatars={defaultAvatars}
					{uploading}
					unlockedAvatars={[]}
					lockableAvatars={[]}
					onselect={(url) => { avatarUrl = url; }}
					onupload={handleFileUpload}
					ondelete={handleDeleteUpload}

				/>
			</div>

			<!-- Name field -->
			<div class="field">
				<label class="field-label" for="edit-name">Display Name</label>
				<input
					id="edit-name"
					name="display-name"
					type="text"
					autocomplete="nickname"
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
					name="bio"
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
				onclick={onclose}
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
</Modal>


<style>
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
		text-align: center;
	}

	.avatar-preview {
		width: 86px;
		height: 86px;
		border-radius: 50%;
		margin: 0.5rem auto 0.75rem;
		overflow: hidden;
		border: 3px solid rgba(255, 107, 157, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
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

	.modal-error {
		color: #f87171;
		font-size: 0.8rem;
		margin: 0;
	}
</style>
