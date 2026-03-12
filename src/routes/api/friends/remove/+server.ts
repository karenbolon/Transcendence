import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { friendships } from '$lib/server/db/schema';
import { eq, and, or } from 'drizzle-orm';
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

	// Either user can unfriend — check both directions
	const [row] = await db
		.select()
		.from(friendships)
		.where(
			and(
				or(
					and(eq(friendships.user_id, userId), eq(friendships.friend_id, friendId)),
					and(eq(friendships.user_id, friendId), eq(friendships.friend_id, userId))
				),
				eq(friendships.status, 'accepted')
			)
		);

	if (!row) {
		return json({ error: 'Friendship not found' }, { status: 404 });
	}

	await db.delete(friendships).where(eq(friendships.id, row.id));

	const otherUserId = row.user_id === userId ? row.friend_id : row.user_id;
	emitToUser(otherUserId, 'friend:removed', { fromUserId: userId });
	return json({ message: 'Friend removed' });
};
