import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const prefsSchema = z.object({
	speedPreset: z.enum(['chill', 'normal', 'fast']),
	winScore: z.number().int().refine(
		(val) => [3, 5, 7, 11].includes(val),
		{ message: 'Invalid win score' }
	),
});

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const result = prefsSchema.safeParse(body);
	if (!result.success) {
		return json({ error: 'Invalid preferences', details: result.error.flatten().fieldErrors }, { status: 400 });
	}

	const userId = Number(locals.user.id);

	await db.update(users)
		.set({
			game_preferences: result.data,
			updated_at: new Date(),
		})
		.where(eq(users.id, userId));

	return json({ success: true, preferences: result.data });
};
