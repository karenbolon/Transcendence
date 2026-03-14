<script lang="ts">
	import './layout.css';
	import { invalidateAll } from '$app/navigation';
	import { connectSocket, disconnectSocket, getSocket } from '$lib/stores/socket.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { onDestroy } from 'svelte';
	import favicon from '$lib/assets/favicon.ico';
	import Header from '$lib/component/Header.svelte';
	import Footer from '$lib/component/Footer.svelte';
	import { initI18n, normaliseLocale, FALLBACK_LOCALE } from '$lib/i18n';
	import { _ , locale as localeStore, isLoading } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import Toast from '$lib/component/Toast.svelte';
	import { setUserLanguage } from '$lib/utils/language_utils';
	import InviteModal from '$lib/component/InviteModal.svelte';

	let pendingInvite: {
		inviteId: string;
		challenger:  { username: string; displayName: string | null; avatarUrl: string | null };
		settings: { speedPreset: string; winScore: number };
	} | null = $state(null);

	let { children, data } = $props<{
		children: any;
		data?: {
			user?: any;
			locale?: string;
		}
	}>();

	// Always initialize with fallback to avoid hydration mismatch
	initI18n(FALLBACK_LOCALE);
	localeStore.set(FALLBACK_LOCALE);

	// After component mounts, set the correct language preference
	onMount(async () => {
		// Priority: 1. Server data (database), 2. localStorage, 3. fallback
		let preferredLocale = FALLBACK_LOCALE;

		if (data?.locale && data.locale !== FALLBACK_LOCALE) {
			// Use database preference if available
			preferredLocale = normaliseLocale(data.locale);
		} else {
			// Fall back to localStorage if no database preference
			const stored = localStorage.getItem('locale');
			if (stored && stored !== 'null' && stored !== FALLBACK_LOCALE) {
				preferredLocale = normaliseLocale(stored);
			}
		}

		if (preferredLocale !== FALLBACK_LOCALE) {
			// Set language but don't save to database (just loading existing preference)
			await setUserLanguage(preferredLocale, false);
		}

		// Connect socket if user is logged in
		if (data?.user) {
			connectSocket();

			// Global friend notification toasts + data refresh (work on any page)
			const socket = getSocket();
			if (socket) {
				socket.on('friend:request', (evtData: { fromUsername: string }) => {
					toast.friend('Friend Request', `${evtData.fromUsername} sent you a friend request`);
					invalidateAll();
				});
				socket.on('friend:accepted', (evtData: { fromUsername: string }) => {
					toast.friend('Request Accepted', `${evtData.fromUsername} accepted your friend request`);
					invalidateAll();
				});
				socket.on('friend:removed', () => { invalidateAll(); });
				socket.on('friend:online', () => { invalidateAll(); });
				socket.on('friend:offline', () => { invalidateAll(); });

				socket.on('game:invite', (evtData: { inviteId: string; fromUsername: string; fromUserId: number; fromDisplayName: string | null; fromAvatarUrl: string | null; settings: { speedPreset: string; winScore: number }
				}) => {
					pendingInvite = {
						inviteId: evtData.inviteId,
						challenger: { username: evtData.fromUsername, displayName: evtData.fromDisplayName ?? null, avatarUrl: evtData.fromAvatarUrl ?? null },
						settings: evtData.settings ?? { speedPreset: 'normal', winScore: 5 },
					};
				});


				socket.on('game:invite-expired', () => {
					pendingInvite = null;
					toast.warning('Game invite expired');
				});

				socket.on('game:invite-declined', () => {
					toast.game('Challenge Declined');;
				});

				socket.on('game:start', (evtData: { gameId: string; opponent: string; side: string }) => {
					pendingInvite = null;
					toast.game('Game Starting!', `Match against ${evtData.opponent}`);
					// TODO: navigate to game page later
				});
			}
		}

	});

	function acceptInvite() {
		const s = getSocket();
		if (s && pendingInvite) {
			s.emit('game:invite-accept', { inviteId: pendingInvite.inviteId });
			pendingInvite = null;
		}
	}

	function declineInvite() {
		const s = getSocket();
		if (s && pendingInvite) {
			s.emit('game:invite-decline', { inviteId: pendingInvite.inviteId });
			pendingInvite = null;
		}
	}

	onDestroy(() => {
		disconnectSocket();
	});

</script>

<svelte:head>
	{#if !$isLoading}
		<title>PONG - ft_transcendence</title>
		<meta name="description" content={$_('meta.description')} />
	{:else}
		<title>PONG - ft_transcendence</title>
		<meta name="description" content="Play the classic Pong game online!" />
	{/if}
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="web">
<!-- use data? as data is optional, this says if data then... -->
	<Header user={data?.user} />
	<main>{@render children()}</main>
	<Footer user={data?.user} />
</div>

{#if pendingInvite}
	<InviteModal
		challenger={pendingInvite.challenger}
		settings={pendingInvite.settings}
		timeoutSecs={30}
		onAccept={acceptInvite}
		onDecline={declineInvite}
	/>
{/if}

<Toast />
