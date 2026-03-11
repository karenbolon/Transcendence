import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { friendships } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ errorKey: 'errors.not_authenticated' }, { status: 401 });
	}

	const userId = Number(locals.user.id);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ errorKey: 'errors.invalid_json_body' }, { status: 400 });
	}

	const { friendId } = body as { friendId: number };

	if (typeof friendId !== 'number' || Number.isNaN(friendId)) {
		return json({ errorKey: 'errors.friendId' }, { status: 400 });
	}

	// Only the RECEIVER (friend_id) can accept
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
		return json({ errorKey: 'errors.noPending'}, { status: 404 });
	}

	await db
		.update(friendships)
		.set({ status: 'accepted' })
		.where(eq(friendships.id, row.id));

	return json({ messageKey: 'friend.acceptedDesc' });
};
