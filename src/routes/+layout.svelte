<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';
	import Header from '$lib/component/common/Header.svelte';
	import Footer from '$lib/component/common/Footer.svelte';
	import InviteModal from '$lib/component/common/InviteModal.svelte';
	import Toast from '$lib/component/common/Toast.svelte';
	import ChatPanel from '$lib/component/chat/ChatPanel.svelte';
	import ReturnToMatchPill from '$lib/component/common/ReturnToMatchPill.svelte';
	import { receiveMessage, onMessageSent, setTyping, clearTyping, loadUnreadCounts, resetChat, isChatOpen, getActiveFriendId, openChat, closeChat } from '$lib/stores/chat.svelte';
	import { afterNavigate } from '$app/navigation';
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { connectSocket, disconnectSocket, reconnectSocket, getSocket } from '$lib/stores/socket.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { onDestroy } from 'svelte';
	import { onMount } from 'svelte';

	let activeRoomId = $state<string | null>(null);
	const destroyedRooms = new Set<string>();

	let pendingInvite: {
		inviteId: string;
		challenger:  { username: string; displayName: string | null; avatarUrl: string | null };
		settings: { speedPreset: string; winScore: number; powerUps: boolean };
	} | null = $state(null);

	let { children, data } = $props<{
		children: any;
		data?: {
			user?: any;
			notificationPrefs?: {
				friendRequests: boolean;
				gameInvites: boolean;
				matchResults: boolean;
			} | null;
		}
	}>();

	// Track current game opponent to suppress their chat toasts during the match
	let currentOpponentId: number | null = $state(null);

	/** Check if a notification type is enabled. Defaults to true if prefs not loaded. */
	function isNotifEnabled(key: 'friendRequests' | 'gameInvites' | 'matchResults'): boolean {
		return data?.notificationPrefs?.[key] ?? true;
	}

	/** Register all global socket listeners (notifications, invites, game start). */
	function registerSocketListeners() {
		const socket = getSocket();
		if (!socket) return;

		// Remove any previous listeners to avoid duplicates after reconnect
		socket.off('friend:request');
		socket.off('friend:accepted');
		socket.off('friend:removed');
		socket.off('friend:online');
		socket.off('friend:offline');
		socket.off('game:invite');
		socket.off('game:invite-expired');
		socket.off('game:invite-cancelled');
		socket.off('game:invite-declined');
		socket.off('game:start');
		// Remove old chat listeners
		socket.off('chat:message');
		socket.off('chat:sent');
		socket.off('chat:typing');
		socket.off('chat:stop-typing');
		socket.off('chat:read-receipt');
		socket.off('chat:error');
		//tournament
		socket.off('game:active-room');
		socket.off('game:room-destroyed');
		socket.off('game:paused');
		socket.off('tournament:cancelled');
		socket.off('tournament:invited');
		socket.off('tournament:match-ready');
		socket.off('tournament:started');
		socket.off('tournament:eliminated');
		socket.off('tournament:finished');

		socket.on('friend:request', (evtData: { fromUsername: string }) => {
			if (isNotifEnabled('friendRequests')) {
				toast.friend('Friend Request', `${evtData.fromUsername} sent you a friend request`);
			}
			invalidateAll();
		});
		socket.on('friend:accepted', (evtData: { fromUsername: string }) => {
			if (isNotifEnabled('friendRequests')) {
				toast.friend('Request Accepted', `${evtData.fromUsername} accepted your friend request`);
			}
			invalidateAll();
		});
		socket.on('friend:removed', () => { invalidateAll(); });
		socket.on('friend:online', () => { invalidateAll(); });
		socket.on('friend:offline', () => { invalidateAll(); });

		socket.on('game:invite', (evtData: { inviteId: string; fromUsername: string; fromUserId: number; fromDisplayName: string | null; fromAvatarUrl: string | null; settings: { speedPreset: string; winScore: number; powerUps: boolean }
		}) => {
			pendingInvite = {
				inviteId: evtData.inviteId,
				challenger: { username: evtData.fromUsername, displayName: evtData.fromDisplayName ?? null, avatarUrl: evtData.fromAvatarUrl ?? null },
				settings: evtData.settings ?? { speedPreset: 'normal', winScore: 5, powerUps: false },
			};
		});

		socket.on('game:invite-expired', () => {
			pendingInvite = null;
			if (isNotifEnabled('gameInvites')) {
				toast.warning('Game invite expired');
			}
		});

		socket.on('game:invite-cancelled', () => {
			pendingInvite = null;
		});

		socket.on('game:invite-declined', () => {
			if ($page.url.pathname.includes('/play/online/waiting')) return;
			if (isNotifEnabled('gameInvites')) {
				toast.game('Challenge Declined');
			}
		});

		socket.on('game:start', (evtData: { roomId: string; player1: { userId: number; username: string }; player2: { userId: number; username: string }; settings: any }) => {
			pendingInvite = null;
			// Track opponent for chat toast suppression
			const myId = data?.user?.id;
			if (myId) {
				currentOpponentId = evtData.player1.userId === Number(myId)
					? evtData.player2.userId : evtData.player1.userId;
			}
			// Only defer to pages that have their own game:start handler:
			// - /play (queue match-found modal)
			// - /play/online/waiting (invite waiting room)
			const path = $page.url.pathname;
			if (path === '/play' || path.startsWith('/play/online/waiting')) return;
			goto(`/play/online/${evtData.roomId}`);
		});

		// Chat: incoming message
		socket.on('chat:message', (msg: any) => {
			receiveMessage(msg);

			// During online games, skip toast for the opponent (in-game chat shows it)
			// Still show toasts for other friends messaging you
			const onGamePage = $page.url.pathname.startsWith('/play/online/') && $page.url.pathname !== '/play/online/waiting';
			if (onGamePage && currentOpponentId && msg.senderId === currentOpponentId) return;

			// Show clickable toast if chat panel is not open to this sender
			if (!isChatOpen() || getActiveFriendId() !== msg.senderId) {
				toast.chat(
					`${msg.senderUsername}`,
					msg.content.slice(0, 50),
					() => openChat(msg.senderId),
				);
			}
		});

		// Chat: our own message confirmed (for multi-tab sync)
		socket.on('chat:sent', (msg: any) => {
			onMessageSent(msg);
		});

		// Chat: someone is typing
		socket.on('chat:typing', (data: { userId: number; username: string }) => {
			setTyping(data.userId);
		});

		// Chat: someone stopped typing
		socket.on('chat:stop-typing', (data: { userId: number }) => {
			clearTyping(data.userId);
		});

		// Chat: read receipt
		socket.on('chat:read-receipt', (_data: { readBy: number; friendId: number }) => {
			// Optional: update UI to show "read" checkmarks
		});

		// Chat: error
		socket.on('chat:error', (data: { message: string }) => {
			toast.error(data.message);
		});

		// Tournament: someone invited you
		socket.on('tournament:invited', (evtData: any) => {
			toast.game('Tournament Invite', `${evtData.inviterUsername} invited you to "${evtData.tournamentName}"`);
		});

		socket.on('tournament:cancelled', (evtData: { tournamentId: number; tournamentName: string }) => {
			// If we're on this tournament's detail page, redirect to list
			const path = $page.url.pathname;
			if (path === `/tournaments/${evtData.tournamentId}`) {
				toast.info(`"${evtData.tournamentName}" was cancelled`);
				goto('/tournaments');
			} else {
				// On any other page, just show a toast
				toast.info(`Tournament "${evtData.tournamentName}" was cancelled`);
			}
		});

		socket.on('game:active-room', (evtData: { roomId: string }) => {
			// Don't auto-navigate — just show the "Return to Match" pill.
			// The user clicks it when they're ready.
			// If already on the game page, no pill needed.
			const path = $page.url.pathname;
			if (path === `/play/online/${evtData.roomId}`) return;
			destroyedRooms.clear();
			activeRoomId = evtData.roomId;
		});

		socket.on('game:room-destroyed', () => {
			// Track which room was destroyed so afterNavigate won't re-set the pill
			const currentRoom = activeRoomId ?? $page.url.pathname.split('/play/online/')[1];
			if (currentRoom) destroyedRooms.add(currentRoom);
			activeRoomId = null;
		});

		// Track paused game room so pill shows even if user navigates away during pause
		socket.on('game:paused', (evtData: { disconnectedUserId: number; remaining: number }) => {
			// We need the roomId — get it from the current page if on a game page
			const path = $page.url.pathname;
			if (path.startsWith('/play/online/') && path !== '/play/online/waiting') {
				const roomId = path.split('/play/online/')[1];
				if (roomId) activeRoomId = roomId;
			}
		});

		socket.on('tournament:match-ready', (evtData: any) => {
			const myId = Number(data?.user?.id);
			const opponent = evtData.player1.userId === myId ? evtData.player2.username : evtData.player1.username;
			if (isNotifEnabled('matchResults')) {
				toast.game('Tournament Match', `Your match is ready! vs ${opponent}`);
			}
			// game:start is also emitted, so player navigates automatically
		});

		socket.on('tournament:eliminated', (data: any) => {
			if (isNotifEnabled('matchResults')) {
				toast.info('Tournament', 'You have been eliminated');
			}
		});

		socket.on('tournament:finished', (data: any) => {
			if (isNotifEnabled('matchResults')) {
				toast.game('Tournament Over', `${data.winnerUsername} is the champion!`);
			}
		});
	}

	onMount(async () => {
		if (data?.user) {
			connectSocket();
			registerSocketListeners();
			loadUnreadCounts();
		}
	});

	// Close chat panel on page navigation + clear game opponent tracking
	afterNavigate(({ from, to }) => {
		closeChat();
		const path = to?.url?.pathname ?? '';
		if (!path.startsWith('/play/online/') || path === '/play/online/waiting') {
			currentOpponentId = null;
		}
		// Track active game room for "Return to Match" pill
		if (path.startsWith('/play/online/') && path !== '/play/online/waiting') {
			// Arrived at game page — clear pill
			activeRoomId = null;
		} else if (from?.url?.pathname.startsWith('/play/online/') && from?.url?.pathname !== '/play/online/waiting') {
			// Left a game page — remember the room so pill shows (unless room was destroyed)
			const roomId = from.url.pathname.split('/play/online/')[1];
			if (roomId && !destroyedRooms.has(roomId)) activeRoomId = roomId;
		}
	});

	function acceptInvite() {
		closeChat();
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

	// Reconnect socket when auth state changes (login/register/logout)
	let lastUserId: number | null = $page.data?.user?.id ?? null;
	$effect(() => {
		const currentUserId = data?.user?.id ?? null;
		if (currentUserId !== lastUserId) {
			lastUserId = currentUserId;
			if (currentUserId) {
				reconnectSocket();
				registerSocketListeners();
				loadUnreadCounts();
			} else {
				disconnectSocket();
				resetChat();
			}
		}
	});

	onDestroy(() => {
		disconnectSocket();
	});

</script>

<svelte:head>
	<title>PONG - Pixie_pong</title>
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

{#if activeRoomId && !$page.url.pathname.startsWith('/play/online/')}
	<ReturnToMatchPill onReturn={() => goto(`/play/online/${activeRoomId}`)} />
{/if}

{#if data?.user}
	<ChatPanel user={data.user} />
{/if}
