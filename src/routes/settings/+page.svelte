<script lang="ts">
	import type { PageData } from './$types';
	import DeleteModal from '$lib/component/DeleteModal.svelte';
	import PasswordInput from '$lib/component/PasswordInput.svelte';
	import { validatePassword, validateEmail, validateConfirmPassword } from '$lib/validation/frontend';
	import { handleFormSubmit, fetchJSON } from '$lib/utils/format_utils';
	import { _, locale } from 'svelte-i18n';

	let { data }: { data: PageData } = $props();

	let showDeleteModal = $state(false);

	// Password Change
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordError = $state('');
	let passwordSuccess = $state('');
	let savingPassword = $state(false);

	async function handlePasswordChange(e: SubmitEvent) {
		e.preventDefault();
		passwordError = '';
		passwordSuccess = '';

		await handleFormSubmit({
			url: '/api/settings/password',
			body: { currentPassword, newPassword },
			errorMessage: $_('settings.security.password_change_failed'),
			validate: () => {
				if (!currentPassword || !newPassword || !confirmPassword) return $_('settings.common.all_fields_required');
				return validatePassword(newPassword) || validateConfirmPassword(newPassword, confirmPassword) || undefined;
			},
			onSuccess: () => {
				passwordSuccess = $_('settings.security.password_changed');
				currentPassword = '';
				newPassword = '';
				confirmPassword = '';
			},
			onError: (msg) => { passwordError = msg; },
			onLoading: (v) => { savingPassword = v; },
		});
	}

	// Email Change
	let currentEmail = $derived(data.email);
	let newEmail = $state('');
	let emailPassword = $state('');
	let emailError = $state('');
	let emailSuccess = $state('');
	let savingEmail = $state(false);

	async function handleEmailChange(e: SubmitEvent) {
		e.preventDefault();
		emailError = '';
		emailSuccess = '';

		await handleFormSubmit({
			url: '/api/settings/email',
			body: { newEmail, password: emailPassword },
			errorMessage: $_('settings.email.email_change_failed'),
			validate: () => {
				if (!newEmail || !emailPassword) return $_('settings.common.all_fields_required');
				return validateEmail(newEmail) || undefined;
			},
			onSuccess: (result) => {
				emailSuccess = $_('settings.email.email_updated');
				currentEmail = result.email as string;
				newEmail = '';
				emailPassword = '';
			},
			onError: (msg) => { emailError = msg; },
			onLoading: (v) => { savingEmail = v; },
		});
	}

	// Notification Preferences
	let friendRequests = $derived(data.notificationPrefs.friendRequests);
	let gameInvites = $derived(data.notificationPrefs.gameInvites);
	let matchResults = $derived(data.notificationPrefs.matchResults);

	async function updateNotificationPref(key: string, value: boolean) {
		try {
			await fetchJSON('/api/settings/notifications', 'PUT', { [key]: value });
		} catch {
			// Silently fail
		}
	}
	
	const languages = [
		{ code: 'en', label: '🇬🇧 English' },
		{ code: 'de', label: '🇩🇪 Deutsch' },
		{ code: 'es', label: '🇪🇸 Español' },
		{ code: 'fr', label: '🇫🇷 Français' },
		{ code: 'it', label: '🇮🇹 Italiano' },
		{ code: 'pt', label: '🇵🇹 Português' }
	];

	function changeLanguage(lang: string) {
		locale.set(lang);
		localStorage.setItem('locale', lang);
		
		// Save to database as well
		fetchJSON('/api/settings/language', 'PUT', { language: lang })
			.catch(error => {
				console.error('Failed to save language to database:', error);
				// Continue anyway - localStorage will work for this session
			});
	}
//api keys

</script>

<div class="settings-page">
	<h1 class="page-title">{$_('settings.title')}</h1>

	<!-- ── Account Info ──────────────────────────────── -->
	<section class="settings-card">
		<h2 class="card-title">{$_('settings.account.title')}</h2>
		<div class="info-row">
			<span class="info-label"><strong>{$_('settings.account.username')}</strong></span>
			<span class="info-value">{data.username}</span>
		</div>
		<div class="info-row">
			<span class="info-label"><strong>{$_('settings.account.email')}</strong></span>
			<span class="info-value">{data.email}</span>
		</div>
	</section>

	<section class="setting-card">
		<div class="card-section">
			<h2 class="card-title">{$_('settings.security.title')}</h2>
			<h3 class="section-subtitle">{$_('settings.security.change_password')}</h3>
			<form class="settings-form" onsubmit={handlePasswordChange}>
				<div class="field">
					<label class="field-label" for="current-password">{$_('settings.security.current_password')}</label>
					<PasswordInput id="current-password" name="current-password" bind:value={currentPassword} disabled={savingPassword} autocomplete="current-password" />

				</div>
				<div class="field">
					<label class="field-label" for="new-password">{$_('settings.security.new_password')}</label>
					<PasswordInput id="new-password" name="new-password" bind:value={newPassword} disabled={savingPassword} autocomplete="new-password" />
				</div>
				<div class="field">
					<label class="field-label" for="confirm-password">{$_('settings.security.confirm_new_password')}</label>
					<PasswordInput id="confirm-password" name="confirm-password" bind:value={confirmPassword} disabled={savingPassword} autocomplete="new-password" />
				</div>
				{#if passwordError}
					<p class="msg msg--error">{passwordError}</p>
				{/if}
				{#if passwordSuccess}
					<p class="msg msg--success">{passwordSuccess}</p>
				{/if}
				<button type="submit" class="btn btn--primary" disabled={savingPassword}>
					{savingPassword ? $_('settings.security.saving') : $_('settings.security.update_password')}
				</button>
			</form>
		</div>

		<div class="card-section">
			<h3 class="section-subtitle">{$_('settings.email.title')}</h3>
			<p class="current-value">{$_('settings.email.current_email')}<strong>{currentEmail}</strong></p>
			<form class="settings-form" onsubmit={handleEmailChange}>
				<div class="field">
					<label class="field-label" for="new-email">{$_('settings.email.new_email')}</label>
					<input 
						id="new-email" 
						type="email" 
						class="field-input" 
						bind:value={newEmail} 
						disabled={savingEmail} 
						placeholder={$_('settings.email.placeholder')} />
				</div>
				<div class="field">
					<label class="field-label" for="email-password">{$_('settings.email.password')}</label>
					<!-- <input id="email-password" type="password" class="field-input" bind:value={emailPassword} disabled={savingEmail} autocomplete="current-password" placeholder="Confirm your password" /> -->
					<PasswordInput id="confirm-password" name="confirm-password" bind:value={emailPassword} disabled={savingEmail} autocomplete="current-password" />
				</div>

				{#if emailError}
					<p class="msg msg--error">{emailError}</p>
				{/if}
				{#if emailSuccess}
					<p class="msg msg--success">{emailSuccess}</p>
				{/if}

				<button type="submit" class="btn btn--primary" disabled={savingEmail}>
					{savingEmail ? $_('settings.security.saving') : $_('settings.email.update_email')}
				</button>
			</form>
		</div>

	</section>

	<!-- NOTIFICATIONS -->
	<section class="settings-card">
		<h2 class="card-title">{$_('settings.notifications.title')}</h2>

		<div class="toggle-list">
			<label class="toggle-row">
				<div class="toggle-info">
					<span class="toggle-name">{$_('settings.notifications.friend_requests')}</span>
					<span class="toggle-desc">{$_('settings.notifications.friend_requests_desc')}</span>
				</div>
				<input type="checkbox" class="toggle-switch" bind:checked={friendRequests} onchange={() => updateNotificationPref('friendRequests', friendRequests)} />
			</label>

			<label class="toggle-row">
				<div class="toggle-info">
					<span class="toggle-name">{$_('settings.notifications.game_invites')}</span>
					<span class="toggle-desc">{$_('settings.notifications.game_invites_desc')}</span>
				</div>
				<input type="checkbox" class="toggle-switch" bind:checked={gameInvites} onchange={() => updateNotificationPref('gameInvites', gameInvites)} />
			</label>

			<label class="toggle-row">
				<div class="toggle-info">
					<span class="toggle-name">{$_('settings.notifications.match_results')}</span>
					<span class="toggle-desc">{$_('settings.notifications.match_results_desc')}</span>
				</div>
				<input type="checkbox" class="toggle-switch" bind:checked={matchResults} onchange={() => updateNotificationPref('matchResults', matchResults)} />
			</label>
		</div>
	</section>

	<!-- Language Selector -->
	<section class="settings-card">
		<h2 class="card-title">{$_('settings.language.title')}</h2>

		<div class="language-list">
			{#each languages as lang}
				<button
					type="button"
					class="language-btn"
					class:active={$locale === lang.code}
					onclick={() => changeLanguage(lang.code)}
				>
					{lang.label}
				</button>
			{/each}
		</div>
	</section>

	<!-- DANGER ZONE -->
	<section class="settings-card danger">
		<h2 class="card-title danger-title">{$_('settings.danger.title')}</h2>
		<p class="danger-desc">{$_('settings.danger.description')}</p>
		<button class="btn btn--danger" onclick={() => showDeleteModal = true}>
			{$_('settings.danger.delete_account')}
		</button>
	</section>

</div>

<DeleteModal open={showDeleteModal} onclose={() => showDeleteModal = false} />

<style>
	.settings-page {
		width: 100%;
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.page-title {
		font-size: 2.5rem;
		font-weight: 700;
		color: #fff;
		margin: 0;
	}

	.settings-card {
		background: linear-gradient(135deg, rgba(22, 22, 58, 0.8), rgba(16, 16, 42, 0.9));
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 1rem;
		padding: 1.5rem;
		position: relative;
		overflow: hidden;
	}

	.settings-card::before {
		content: '';
		position: absolute;
		top: 0; left: 0; right: 0;
		height: 2px;
		opacity: 0.5;
		background: linear-gradient(90deg, transparent, var(--accent, #ff6b9d), transparent);
	}

	.settings-card.danger {
		border-color: rgba(248, 113, 113, 0.15);
	}

	.settings-card.danger::before {
		background: linear-gradient(90deg, transparent, #f87171, transparent);
	}

	.card-title {
		font-size: 1.45rem;
		font-weight: 600;
		color: #d1d5db;
		margin: 0 0 1.25rem 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.card-title::before {
		content: '';
		width: 3px;
		height: 16px;
		border-radius: 2px;
		background: var(--accent, #ff6b9d);
	}

	.danger-title::before {
		background: #f87171;
	}

	.card-section {
		padding-bottom: 1.25rem;
		margin-bottom: 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.card-section:last-child {
		padding-bottom: 1.25rem;;
		margin-bottom: 1.25rem;
		/* border-bottom: none; */
	}

	.section-subtitle {
		font-size: 0.85rem;
		font-weight: 600;
		color: #9ca3af;
		margin: 0 0 0.75rem 0;
	}

	.current-value {
		font-size: 1.04rem;
		color: #7a7a9e;
		margin: 0 0 0.75rem 0;
	}

	.current-value strong {
		color: #d1d5db;
	}

	.settings-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.field-label {
		font-size: 0.88rem;
		color: #7a7a9e;
		font-weight: 500;
	}

	.field-input {
		padding: 0.55rem 0.85rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);
		color: #f3f4f6;
		font-size: 0.8rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.15s;
	}

	.field-input:focus {
		border-color: rgba(255, 107, 157, 0.4);
	}

	.field-input:disabled {
		opacity: 0.5;
	}

	.msg {
		font-size: 0.78rem;
		margin: 0;
	}

	.msg--error { color: #f87171; }
	.msg--success { color: #4ade80; }

	.btn {
		padding: 0.65rem 1.25rem;
		border-radius: 0.5rem;
		border: none;
		font-family: inherit;
		font-size: 0.92rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
		align-self: flex-start;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn--primary {
		background: rgba(255, 107, 157, 0.12);
		border: 1px solid rgba(255, 107, 157, 0.3);
		color: #ff6b9d;
	}

	.btn--primary:hover:not(:disabled) {
		background: rgba(255, 107, 157, 0.2);
		border-color: rgba(255, 107, 157, 0.5);
	}

	.btn--danger {
		background: rgba(248, 113, 113, 0.1);
		border: 1px solid rgba(248, 113, 113, 0.25);
		color: #f87171;
	}

	.btn--danger:hover:not(:disabled) {
		background: rgba(248, 113, 113, 0.2);
		border-color: rgba(248, 113, 113, 0.4);
	}

	.danger-desc {
		color: #7a7a9e;
		font-size: 0.82rem;
		margin: 0 0 1rem 0;
	}

	.toggle-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 0.5rem;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.15s;
	}

	.toggle-row:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.toggle-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.toggle-name {
		font-size: 0.95rem;
		font-weight: 500;
		color: #d1d5db;
	}

	.toggle-desc {
		font-size: 0.82rem;
		color: #5a5a7e;
	}

	.toggle-switch {
		appearance: none;
		width: 40px;
		height: 22px;
		border-radius: 11px;
		background: rgba(255, 255, 255, 0.1);
		position: relative;
		cursor: pointer;
		transition: background 0.2s;
		flex-shrink: 0;
	}

	.toggle-switch::before {
		content: '';
		position: absolute;
		top: 3px;
		left: 3px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #6b7280;
		transition: all 0.2s;
	}

	.toggle-switch:checked {
		background: rgba(255, 107, 157, 0.25);
	}

	.toggle-switch:checked::before {
		transform: translateX(18px);
		background: #ff6b9d;
	}

	@media (max-width: 640px) {
		.settings-page {
			padding: 1.5rem 1rem 3rem;
		}
	}
	.language-list {
	display: flex;
	gap: 0.75rem;
	flex-wrap: wrap;
	}

	.language-btn {
		padding: 0.65rem 1rem;
		border-radius: 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
		color: #d1d5db;
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	.language-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.16);
	}

	.language-btn.active {
		background: rgba(255, 107, 157, 0.12);
		border-color: rgba(255, 107, 157, 0.35);
		color: #ff6b9d;
	}

</style>
