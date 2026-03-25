import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { messages } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/** GET /api/chat/unread → { counts: { [senderId]: number } } */
export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	// Count unread messages grouped by sender
	const rows = await db
		.select({
			senderId: messages.sender_id,
			count: sql<number>`count(*)::int`,
		})
		.from(messages)
		.where(
			and(
				eq(messages.recipient_id, Number(user.id)),
				eq(messages.is_read, false),
				eq(messages.type, 'chat'),
			)
		)
		.groupBy(messages.sender_id);

	const counts: Record<number, number> = {};
	for (const row of rows) {
		counts[row.senderId] = row.count;
	}

	return json({ counts });
};