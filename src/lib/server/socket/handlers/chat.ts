import type { Socket } from 'socket.io';
import { getIO, userSockets } from '../index';
import { db } from '$lib/server/db';
import { messages } from '$lib/server/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { getFriendIds, isBlocked } from '$lib/server/db/helpers_queries';

export function registerChatHandlers(socket: Socket) {
	const userId: number = socket.data.userId;
	const username: string = socket.data.username;

	// Send a message to a friend
	socket.on('chat:send', async (data: {
		recipientId: number;
		content: string;
		gameId?: number;  // optional — set during in-game chat
	}) => {
		const { recipientId, content, gameId } = data;

		// Validate
		if (!content || content.trim().length === 0) return;
		if (content.length > 500) return;  // max message length
		if (recipientId === userId) return;

		// Block check — always check, even for in-game chat
		const blocked = await isBlocked(userId, recipientId);
		if (blocked) {
			socket.emit('chat:error', { message: 'Cannot send message to this user' });
			return;
		}

		// Must be friends (skip check for in-game chat)
		if (!gameId) {
			const friendIds = await getFriendIds(userId);
			if (!friendIds.includes(recipientId)) {
				socket.emit('chat:error', { message: 'You can only message friends' });
				return;
			}
		}

		// Save to database
		const [msg] = await db.insert(messages).values({
			sender_id: userId,
			recipient_id: recipientId,
			game_id: gameId ?? null,
			type: 'chat',
			content: content.trim(),
		}).returning();

		// Build the message payload
		const payload = {
			id: msg.id,
			senderId: userId,
			senderUsername: username,
			senderAvatar: socket.data.avatarUrl,
			recipientId,
			content: msg.content,
			createdAt: msg.created_at instanceof Date ? msg.created_at.toISOString() : String(msg.created_at),
			gameId: gameId ?? null,
		};

		// Send to recipient (all their tabs)
		const recipientSockets = userSockets.get(recipientId);
		if (recipientSockets) {
			const io = getIO();
			for (const sid of recipientSockets) {
				io.to(sid).emit('chat:message', payload);
			}
		}

		// Confirm to sender
		socket.emit('chat:sent', payload);
	});

	// Mark messages as read
	socket.on('chat:read', async (data: { friendId: number }) => {
		await db.update(messages)
			.set({ is_read: true, read_at: new Date() })
			.where(
				and(
					eq(messages.sender_id, data.friendId),
					eq(messages.recipient_id, userId),
					eq(messages.is_read, false),
				)
			);

		// Notify sender their messages were read
		const senderSockets = userSockets.get(data.friendId);
		if (senderSockets) {
			const io = getIO();
			for (const sid of senderSockets) {
				io.to(sid).emit('chat:read-receipt', { readBy: userId, friendId: data.friendId });
			}
		}
	});

	// Typing indicator
	socket.on('chat:typing', (data: { recipientId: number }) => {
		const recipientSockets = userSockets.get(data.recipientId);
		if (recipientSockets) {
			const io = getIO();
			for (const sid of recipientSockets) {
				io.to(sid).emit('chat:typing', { userId, username });
			}
		}
	});

	// ── Stop typing indicator ──────────────────────────────
	socket.on('chat:stop-typing', (data: { recipientId: number }) => {
		const recipientSockets = userSockets.get(data.recipientId);
		if (recipientSockets) {
			const io = getIO();
			for (const sid of recipientSockets) {
				io.to(sid).emit('chat:stop-typing', { userId });
			}
		}
	});
}