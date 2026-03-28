import { goto } from '$app/navigation';
import { getSocket } from '$lib/stores/socket.svelte';
import { setWaiting } from '$lib/stores/matchmaking.svelte';
import { toast } from '$lib/stores/toast.svelte';

type ChallengePlayer = {
	username: string;
	avatarUrl: string | null;
	displayName: string | null;
};

/**
 * Send a game challenge to a friend via socket, set the waiting store,
 * and navigate to the waiting room.
 */
export function sendChallenge(
	friendId: number,
	you: ChallengePlayer,
	opponent: ChallengePlayer,
	settings: { speedPreset: string; winScore: number },
): boolean {
	const socket = getSocket();
	if (!socket?.connected) {
		toast.error('Not connected to server');
		return false;
	}
	socket.emit('game:invite', { friendId, settings });

	setWaiting({
		you,
		opponent,
		settings: { speedPreset: settings.speedPreset as 'chill' | 'normal' | 'fast', winScore: settings.winScore, mode: 'online' },
		totalTime: 30,
	});
	goto('/play/online/waiting');
	return true;
}
