import type { Socket } from 'socket.io';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getFriendIds } from '$lib/server/db/helpers_queries';
import { getIO, userSockets } from '../index';

/**
 * Notify all online friends of a user about a status change.
 */
async function notifyFriends(userId: number, event: string, data: Record<string, unknown>) {
	const io = getIO();
	const friendIds = await getFriendIds(userId);

	for (const friendId of friendIds) {
		const friendSocketIds = userSockets.get(friendId);
		if (friendSocketIds) {
			for (const socketId of friendSocketIds) {
				io.to(socketId).emit(event, data);
			}
		}
	}
}

/**
 * Register friend-related socket handlers for a connected user.
 */
export function registerFriendHandlers(socket: Socket) {
	const userId: number = socket.data.userId;
	const username: string = socket.data.username;

	// User just connected — check if this is their first tab
	const socketCount = userSockets.get(userId)?.size ?? 0;

	// If this is their first socket (just came online), update DB and notify friends
	if (socketCount <= 1) {
		db.update(users)
			.set({ is_online: true })
			.where(eq(users.id, userId))
			.then(() => {
				notifyFriends(userId, 'friend:online', { userId, username });
			})
			.catch(() => { /* silently fail */ });
	}

	// On disconnect — check if this was their last tab
	socket.on('disconnect', () => {
		const remaining = userSockets.get(userId)?.size ?? 0;

		// If no more sockets, user went offline
		if (remaining === 0) {
			db.update(users)
				.set({ is_online: false })
				.where(eq(users.id, userId))
				.then(() => {
						notifyFriends(userId, 'friend:offline', { userId, username });
				})
				.catch(() => { /* silently fail */ });
		}
	});
}
