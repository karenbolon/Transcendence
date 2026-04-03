import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth/lucia';
import { db } from '$lib/server/db';
import { users, oauthStates } from '$lib/server/db/schema';
import { eq, lt } from 'drizzle-orm';

export const actions: Actions = {
	default: async ({ locals, cookies }) => {
		if (!locals.session) {
			redirect(302, '/login');
		}

		if (locals.user) {
			await db
				.update(users)
				.set({ is_online: false })
				.where(eq(users.id, Number(locals.user.id)));
		}

		await lucia.invalidateSession(locals.session.id);

		// Clean up expired OAuth states
		await db.delete(oauthStates).where(lt(oauthStates.expiresAt, new Date()));

		const sessionCookie = lucia.createBlankSessionCookie();
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});

	redirect(302, '/');
	}
};
