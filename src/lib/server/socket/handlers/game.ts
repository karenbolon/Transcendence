import type { Socket } from 'socket.io';
import { getIO, userSockets } from '../index';
import { getFriendIds } from '$lib/server/db/helpers_queries';

// Track active game invites: inviteId → invite data
const activeInvites = new Map<string, {
	fromUserId: number;
	fromUsername: string;
	toUserId: number;
	settings: { speedPreset: string; winScore: number };
	timeout: ReturnType<typeof setTimeout>;
}>();

// Track which users are currently in a game
export const usersInGame = new Set<number>();

export function registerGameHandlers(socket: Socket) {
	const userId: number = socket.data.userId;
	const username: string = socket.data.username;

	// Send a game invite to a friend
	socket.on('game:invite', async (data: { friendId: number; settings: { speedPreset: string; winScore: number } }) => {
		const { friendId, settings } = data;

		// Validate: can't invite yourself
		if (friendId === userId) return;

		// Validate: must be friends
		const friendIds = await getFriendIds(userId);
		if (!friendIds.includes(friendId)) {
			socket.emit('game:error', { message: 'You can only challenge friends' });
			return;
		}

		// Validate: target must be online
		if (!userSockets.has(friendId)) {
			socket.emit('game:error', { message: 'Player is offline' });
			return;
		}

		// Validate: neither player is already in a game
		if (usersInGame.has(userId)) {
			socket.emit('game:error', { message: 'You are already in a game' });
			return;
		}
		if (usersInGame.has(friendId)) {
			socket.emit('game:error', { message: 'Player is already in a game' });
			return;
		}

		const inviteId = `${userId}-${friendId}-${Date.now()}`;

		// Auto-expire after 30 seconds
		const timeout = setTimeout(() => {
			activeInvites.delete(inviteId);
			socket.emit('game:invite-expired', { inviteId });
			// Notify target too
			const targetSockets = userSockets.get(friendId);
			if (targetSockets) {
				const io = getIO();
				for (const sid of targetSockets) {
					io.to(sid).emit('game:invite-expired', { inviteId });
				}
			}
		}, 30000);

		activeInvites.set(inviteId, {
			fromUserId: userId,
			fromUsername: username,
			toUserId: friendId,
			settings,
			timeout,
		});

		// Send invite to target
		const targetSockets = userSockets.get(friendId);
		if (targetSockets) {
			const io = getIO();
			for (const sid of targetSockets) {
				io.to(sid).emit('game:invite', {
				inviteId,
				fromUserId: userId,
				fromUsername: username,
				settings,
				});
			}
		}
	});

	// Accept an invite
	socket.on('game:invite-accept', (data: { inviteId: string }) => {
		const invite = activeInvites.get(data.inviteId);
		if (!invite || invite.toUserId !== userId) return;

		// Clear the timeout
		clearTimeout(invite.timeout);
		activeInvites.delete(data.inviteId);

		// Create a game room
		const roomId = `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

		// Mark both as in game
		usersInGame.add(invite.fromUserId);
		usersInGame.add(userId);

		// Notify both players to go to the game
		const io = getIO();
		const gameData = {
			roomId,
			player1: { userId: invite.fromUserId, username: invite.fromUsername },
			player2: { userId, username },
			settings: invite.settings,
		};

		// Notify challenger
		const challengerSockets = userSockets.get(invite.fromUserId);
		if (challengerSockets) {
			for (const sid of challengerSockets) {
				io.to(sid).emit('game:start', gameData);
			}
		}

		// Notify accepter
		const accepterSockets = userSockets.get(userId);
		if (accepterSockets) {
			for (const sid of accepterSockets) {
				io.to(sid).emit('game:start', gameData);
			}
		}
	});

	// Decline an invite
	socket.on('game:invite-decline', (data: { inviteId: string }) => {
		const invite = activeInvites.get(data.inviteId);
		if (!invite || invite.toUserId !== userId) return;

		clearTimeout(invite.timeout);
		activeInvites.delete(data.inviteId);

		// Notify challenger
		const challengerSockets = userSockets.get(invite.fromUserId);
		if (challengerSockets) {
			const io = getIO();
			for (const sid of challengerSockets) {
				io.to(sid).emit('game:invite-declined', { fromUsername: username });
			}
		}
	});

	// Clean up on disconnect
	socket.on('disconnect', () => {
		// Cancel any pending invites from this user
		for (const [inviteId, invite] of activeInvites) {
			if (invite.fromUserId === userId || invite.toUserId === userId) {
				clearTimeout(invite.timeout);
				activeInvites.delete(inviteId);
			}
		}
	});
}
