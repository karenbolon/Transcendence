import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
// import { checkOnboardingAchievements } from '$lib/server/progression/onboarding';

export const PUT: RequestHandler = async ({ locals, request }) => {
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

	const { name, bio, avatarUrl } = body as {
		name?: string;
		bio?: string;
		avatarUrl?: string | null;
	};

	// Validate name
	if (name !== undefined) {
		if (typeof name !== 'string' || name.trim().length === 0) {
			return json({ error: 'Name is required' }, { status: 400 });
		}
		if (name.trim().length > 100) {
			return json({ error: 'Name must be 100 characters or less' }, { status: 400 });
		}
	}

	// Validate bio
	if (bio !== undefined && typeof bio === 'string' && bio.length > 300) {
		return json({ error: 'Bio must be 300 characters or less' }, { status: 400 });
	}

	// Validate avatarUrl
	if (avatarUrl !== undefined && avatarUrl !== null && typeof avatarUrl !== 'string') {
		return json({ error: 'Invalid avatar URL' }, { status: 400 });
	}

	try {
		const updates: Record<string, unknown> = { updated_at: new Date() };

		if (name !== undefined) updates.name = name.trim();
		if (bio !== undefined) updates.bio = bio?.trim() || null;
		if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

		const [updated] = await db
			.update(users)
			.set(updates)
			.where(eq(users.id, userId))
			.returning({
				id: users.id,
				name: users.name,
				bio: users.bio,
				avatar_url: users.avatar_url,
			});

		// Check for onboarding achievements
		// 	const progressionResult = await checkOnboardingAchievements(userId);

		return json({
			user: {
				id: updated.id,
				name: updated.name,
				bio: updated.bio,
				avatarUrl: updated.avatar_url,
			},
			// newAchievements: progressionResult.newAchievements,
			// xpAwarded: progressionResult.totalXpAwarded,
		});
	} catch (err) {
		console.error('Failed to update profile:', err);
		return json({ error: 'Failed to update profile' }, { status: 500 });
	}
};