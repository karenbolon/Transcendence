import { invalidateAll } from '$app/navigation';
import { toast } from '$lib/stores/toast.svelte';

type FriendAction = 'accept' | 'decline' | 'block' | 'remove' | 'unblock' | 'cancel' | 'request';

const ENDPOINTS: Record<FriendAction, string> = {
	accept: '/api/friends/accept',
	decline: '/api/friends/decline',
	block: '/api/friends/block',
	remove: '/api/friends/remove',
	unblock: '/api/friends/unblock',
	cancel: '/api/friends/cancel',
	request: '/api/friends/request',
};

const SUCCESS_MESSAGES: Record<FriendAction, string> = {
	accept: 'Friend added!',
	decline: 'Request declined',
	block: 'User blocked',
	remove: 'Friend removed',
	unblock: 'User unblocked',
	cancel: 'Request cancelled',
	request: 'Friend request sent',
};

export async function friendAction(action: FriendAction, friendId: number): Promise<boolean> {
	const endpoint = ENDPOINTS[action];
	if (!endpoint) return false;

	try {
		const res = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ friendId }),
		});

		if (res.ok) {
			toast.success(SUCCESS_MESSAGES[action]);
			await invalidateAll();
			return true;
		} else {
			const err = await res.json().catch(() => ({}));
			toast.error(err.error || `Failed to ${action}`);
			return false;
		}
	} catch {
		toast.error('Network error');
		return false;
	}
}
