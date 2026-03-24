import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const prefsSchema = z.object({
	speedPreset: z.enum(['chill', 'normal', 'fast']).optional(),
	winScore: z.number().int().refine(v => [3, 5, 7, 11].includes(v), { message: 'Invalid win score' }).optional(),
	theme: z.string().max(30).optional(),
	ballSkin: z.string().max(30).optional(),
	effectsPreset: z.enum(['none', 'subtle', 'arcade', 'spectacle', 'custom']).optional(),
	effectsCustom: z.object({
		trail: z.enum(['off', 'short', 'long']),
		particles: z.boolean(),
		screenShake: z.boolean(),
		speedLines: z.boolean(),
		chromaticAberration: z.boolean(),
		freezeFrames: z.boolean(),
	}).optional(),
	soundVolume: z.number().int().min(0).max(100).optional(),
	soundMuted: z.boolean().optional(),
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

	// READ current stored preferences
	const [row] = await db.select({ prefs: users.game_preferences })
		.from(users)
		.where(eq(users.id, userId));

	const existing = (row?.prefs as Record<string, unknown>) ?? {};

	// MERGE incoming partial with existing
	const merged = { ...existing, ...result.data };

	// WRITE merged result back
	await db.update(users)
		.set({
			game_preferences: merged as any,
			updated_at: new Date(),
		})
		.where(eq(users.id, userId));

	return json({ success: true, preferences: merged });
};
