import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { friendships, users } from '$lib/server/db/schema';
import { eq, and, or } from 'drizzle-orm';

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

	if (friendId === userId) {
		return json({ error: 'Cannot send a request to yourself' }, { status: 400 });
	}

	// Check target user exists
	const [target] = await db
		.select({ id: users.id, is_deleted: users.is_deleted })
		.from(users)
		.where(and(eq(users.id, friendId), eq(users.is_deleted, false)));

	if (!target || target.is_deleted) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	// Check if any friendship row exists between these two users
	const [existing] = await db
		.select()
		.from(friendships)
		.where(
			or(
				and(eq(friendships.user_id, userId), eq(friendships.friend_id, friendId)),
				and(eq(friendships.user_id, friendId), eq(friendships.friend_id, userId))
			)
		);

	if (existing) {
		if (existing.status === 'accepted') {
			return json({ error: 'You are already friends with this user' }, { status: 409 });
		}
		if (existing.status === 'pending') {
			// If THEY sent us a request, auto-accept
			if (existing.user_id === friendId) {
				await db
					.update(friendships)
					.set({ status: 'accepted' })
					.where(eq(friendships.id, existing.id));
				return json({ message: 'Friend request accepted', status: 'accepted' });
			}
			return json({ error: 'Friend Request already sent' }, { status: 409 });
		}
		if (existing.status === 'blocked') {
			if (existing.user_id === friendId) {
				// They blocked us — don't reveal this
				return json({ error: 'Unable to send request' }, { status: 403 });
			}
			// We blocked them — can't send while blocked
			return json({ error: 'You have this user blocked' }, { status: 400 });
		}
		// Status is 'rejected' — allow re-request by updating the row
		await db
			.update(friendships)
			.set({ status: 'pending', user_id: userId, friend_id: friendId, created_at: new Date() })
			.where(eq(friendships.id, existing.id));
		return json({ message: 'Friend request sent', status: 'pending' });
	}

	// No existing row — create new request
	await db.insert(friendships).values({
		user_id: userId,
		friend_id: friendId,
		status: 'pending',
	});

	return json({ message: 'Friend request sent', status: 'pending' });
};
