<script lang="ts">

	type Props = {
		open: boolean;
		onclose: () => void;
	};

	let { open, onclose }: Props = $props();

	let deletePassword = $state('');
	let deleteError = $state('');
	let isDeleting = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		deleteError = '';

		if (!deletePassword.trim()) {
			deleteError = "Password is required to access your account";
			return;
		}

		isDeleting = true;
		try {
			const formData = new FormData();
			formData.set('password', deletePassword);

			const res = await fetch('/account/delete', {
				method: 'POST',
				body: formData,
			});

			if (res.redirected) {
				window.location.href = res.url;
				return;
			}

			if (!res.ok) {
				const result = await res.json();
				deleteError = result?.data?.error ?? "Failed to delete account.";
			} else {
				window.location.href = '/';
			}
		} catch {
			deleteError = "Something went wrong. Please try again.";
		} finally {
			isDeleting = false;
		}
	}

	function handleBackdropClick() {
		if (!isDeleting) {
			deletePassword = '';
			deleteError = '';
			onclose();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={handleBackdropClick}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2 class="modal-title">Delete Account</h2>
			<p class="modal-desc">This action is <strong>permanent</strong>. Your account,profile, and stats will be removed. Your match history will be preserved for other players.
			</p>

			<form onsubmit={handleSubmit}>
				<label class="modal-label" for="delete-password">Confirm password
				</label>
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
						onclick={handleBackdropClick}
						disabled={isDeleting}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="modal-btn modal-btn--delete"
						disabled={isDeleting}
					>
						{isDeleting ? 'Saving...': 'Delete Account'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
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

	.modal-btn--delete {
		background: #dc2626;
		color: white;
	}

	.modal-btn--delete:hover:not(:disabled) {
		background: #b91c1c;
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