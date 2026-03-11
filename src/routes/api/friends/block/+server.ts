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
		return json({ error: 'Cannot block yourself' }, { status: 400 });
	}

	// Check target exists
	const [target] = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.id, friendId), eq(users.is_deleted, false)));

	if (!target) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	// Check existing friendship row
	const [existing] = await db
		.select()
		.from(friendships)
		.where(
			or(
				and(eq(friendships.user_id, userId), eq(friendships.friend_id, friendId)),
				and(eq(friendships.user_id, friendId), eq(friendships.friend_id, userId))
			)
		);

	if (!existing) {
		return json({ error: 'You can only block friends' }, { status: 400 });
	}

	if (existing.status === 'blocked' && existing.user_id === userId) {
		return json({ error: 'User already blocked' }, { status: 409 });
	}

	if (existing.status !== 'accepted') {
		return json({ error: 'You can only block friends' }, { status: 400 });
	}

	// Block: set blocker as user_id so only they can unblock
	await db
		.update(friendships)
		.set({ status: 'blocked', user_id: userId, friend_id: friendId })
		.where(eq(friendships.id, existing.id));

	return json({ message: 'User blocked' });
};
