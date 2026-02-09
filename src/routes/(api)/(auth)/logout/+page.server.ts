import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth/lucia';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const actions: Actions = {
	default: async ({ locals, cookies }) => {
		if (!locals.session) {
			redirect(302, '/');
		}

		if (locals.user) {
			await db
				.update(users)
				.set({ is_online: false })
				.where(eq(users.id, Number(locals.user.id)));
		}

		await lucia.invalidateSession(locals.session.id);

		const sessionCookie = lucia.createBlankSessionCookie();
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});

		redirect(302, '/');
	}
};
