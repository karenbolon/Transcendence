import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { SUPPORTED_LOCALES } from '$lib/i18n';

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const { language } = await request.json();

		// Validate language
		if (!language || !SUPPORTED_LOCALES.includes(language)) {
			return json({ error: 'Invalid language' }, { status: 400 });
		}

		// Update user's language preference in database
		await db
			.update(users)
			.set({ 
				language: language,
				updated_at: new Date()
			})
			.where(eq(users.id, Number(locals.user.id)));

		return json({ success: true, language });
	} catch (error) {
		console.error('Error updating language:', error);
		return json({ error: 'Failed to update language' }, { status: 500 });
	}
};