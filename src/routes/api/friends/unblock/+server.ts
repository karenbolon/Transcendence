import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { friendships } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

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

	// Only the blocker (user_id) can unblock
	const [row] = await db
		.select()
		.from(friendships)
		.where(
			and(
				eq(friendships.user_id, userId),
				eq(friendships.friend_id, friendId),
				eq(friendships.status, 'blocked')
			)
		);

	if (!row) {
		return json({ error: 'Block not found' }, { status: 404 });
	}

	// Restore friendship — they were friends before blocking
	await db
		.update(friendships)
		.set({ status: 'accepted' })
		.where(eq(friendships.id, row.id));

	return json({ message: 'User unblocked' });
};
