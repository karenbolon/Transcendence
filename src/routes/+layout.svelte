<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';
	import Header from '$lib/component/Header.svelte';
	import Footer from '$lib/component/Footer.svelte';
	import InviteModal from '$lib/component/InviteModal.svelte';
	import Toast from '$lib/component/Toast.svelte';
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { connectSocket, disconnectSocket, getSocket } from '$lib/stores/socket.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { onDestroy } from 'svelte';
	import { onMount } from 'svelte';

	let pendingInvite: {
		inviteId: string;
		challenger:  { username: string; displayName: string | null; avatarUrl: string | null };
		settings: { speedPreset: string; winScore: number };
	} | null = $state(null);

	let { children, data } = $props<{
		children: any;
		data?: {
			user?: any;
		}
	}>();

	onMount(async () => {
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

				socket.on('game:invite-cancelled', () => {
					pendingInvite = null;
				});

				socket.on('game:invite-declined', () => {
					if ($page.url.pathname.includes('/play/online/waiting')) return;
					toast.game('Challenge Declined');
				});

				socket.on('game:start', (evtData: { roomId: string; player1: { userId: number; username: string }; player2: { userId: number; username: string }; settings: any }) => {
					pendingInvite = null;
					// If on the waiting page, let that page handle the navigation
					if (!$page.url.pathname.includes('/play/online/waiting')) {
						goto(`/play/online/${evtData.roomId}`);
					}
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
	<title>PONG - ft_transcendence</title>
	<meta name="description" content="Play the classic Pong game online!" />
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
