import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { messages } from '$lib/server/db/schema';
import { eq, and, or, desc, lt } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals, url }) => {
	const user = locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const friendId = Number(params.friendId);
	const before = url.searchParams.get('before'); // message ID cursor
	const limit = 50;

	const conditions = [
		or(
			and(eq(messages.sender_id, Number(user.id)), eq(messages.recipient_id, friendId)),
			and(eq(messages.sender_id, friendId), eq(messages.recipient_id, Number(user.id))),
		)
	];

	// If cursor provided, only get messages before that ID
	if (before) {
		conditions.push(lt(messages.id, Number(before)));
	}

	const history = await db
		.select()
		.from(messages)
		.where(and(...conditions))
		.orderBy(desc(messages.created_at))
		.limit(limit + 1); // fetch one extra to check if there are more

	const hasMore = history.length > limit;
	const page = hasMore ? history.slice(0, limit) : history;

	return json({
		messages: page.reverse().map(m => ({
			id: m.id,
			senderId: m.sender_id,
			recipientId: m.recipient_id,
			content: m.content,
			createdAt: m.created_at instanceof Date ? m.created_at.toISOString() : String(m.created_at),
			type: m.type,
			gameId: m.game_id,
			senderUsername: '',
			senderAvatar: null,
		})),
		hasMore,
	});
};