import { z } from 'zod';

const chatSendSchema = z.object({
	recipientId: z.number().int().positive(),
	content: z.string(),
	gameId: z.number().int().positive().nullable().optional(),
});

const chatReadSchema = z.object({
	friendId: z.number().int().positive(),
});

const chatTypingSchema = z.object({
	recipientId: z.number().int().positive(),
});

export function registerChatHandlers({ socket, userId, username, sql, emitToUser, areFriends, isBlocked }) {
	function emitChatError(message) {
		socket.emit('chat:error', { message });
	}

	function parseOrChatError(schema, data, message = 'Invalid chat request') {
		const parsed = schema.safeParse(data);
		if (!parsed.success) {
			emitChatError(message);
			return null;
		}
		return parsed.data;
	}

	socket.on('chat:send', async (data) => {
		const request = parseOrChatError(chatSendSchema, data);
		if (!request) return;
		const { recipientId, content, gameId } = request;
		if (!content?.trim() || content.length > 500) return;
		if (recipientId === userId) return;

		// Block check
		const blocked = await isBlocked(userId, recipientId);
		if (blocked) {
			emitChatError('Cannot send message to this user');
			return;
		}

		// Friend check (skip for in-game chat)
		if (!gameId) {
			const isFriend = await areFriends(userId, recipientId);
			if (!isFriend) {
				emitChatError('You can only message friends');
				return;
			}
		}

		const [msg] = await sql`
			INSERT INTO messages (sender_id, recipient_id, game_id, type, content)
			VALUES (${userId}, ${recipientId}, ${gameId ?? null}, 'chat', ${content.trim()})
			RETURNING *
		`;

		const payload = {
			id: msg.id,
			senderId: userId,
			senderUsername: username,
			senderAvatar: socket.data?.avatarUrl ?? null,
			recipientId,
			content: msg.content,
			createdAt: msg.created_at,
			gameId: gameId ?? null,
		};

		emitToUser(recipientId, 'chat:message', payload);
		socket.emit('chat:sent', payload);
	});

	socket.on('chat:read', async (data) => {
		const payload = parseOrChatError(chatReadSchema, data);
		if (!payload) return;
		const { friendId } = payload;
		await sql`
			UPDATE messages SET is_read = true, read_at = NOW()
			WHERE sender_id = ${friendId} AND recipient_id = ${userId} AND is_read = false
		`;
		emitToUser(friendId, 'chat:read-receipt', { readBy: userId, friendId });
	});

	socket.on('chat:typing', (data) => {
		const payload = parseOrChatError(chatTypingSchema, data);
		if (!payload) return;
		emitToUser(payload.recipientId, 'chat:typing', { userId, username });
	});

	socket.on('chat:stop-typing', (data) => {
		const payload = parseOrChatError(chatTypingSchema, data);
		if (!payload) return;
		emitToUser(payload.recipientId, 'chat:stop-typing', { userId });
	});
}
