import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { friendships } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { emitToUser } from '$lib/server/socket/emitters';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const userId = Number(locals.user.id);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { friendId } = body as { friendId: number };

	if (!friendId || typeof friendId !== 'number') {
		return json({ error: 'friendId is required' }, { status: 400 });
	}

	// Only the RECEIVER can decline
	const [row] = await db
		.select()
		.from(friendships)
		.where(
			and(
				eq(friendships.user_id, friendId),
				eq(friendships.friend_id, userId),
				eq(friendships.status, 'pending')
			)
		);

	if (!row) {
		return json({ error: 'No pending request found' }, { status: 404 });
	}

	// Delete the row so they can send again later
	await db.delete(friendships).where(eq(friendships.id, row.id));

	// Notify the sender their request was declined (updates their "Sent" tab)
	emitToUser(friendId, 'friend:removed', { fromUserId: userId });
	return json({ message: 'Friend request declined' });
};
