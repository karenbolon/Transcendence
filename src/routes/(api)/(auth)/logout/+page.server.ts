import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth/lucia';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const actions: Actions = {
	default: async ({ locals, cookies }) => {
		// ═══════════════════════════════════════════════════════════════════
		// Step 1: Check if there's a session to destroy
		// ═══════════════════════════════════════════════════════════════════
		if (!locals.session) {
			// No session = already logged out, just redirect
			redirect(302, '/');
		}

		if (locals.user) {
			await db
				.update(users)
				.set({ is_online: false })
				.where(eq(users.id, Number(locals.user.id)));
		}

		// ═══════════════════════════════════════════════════════════════════
		// Step 2: Invalidate the session in the database
		// ═══════════════════════════════════════════════════════════════════
		// This deletes the session row from the sessions table.
		// Even if someone has the old cookie, it won't work anymore.
		await lucia.invalidateSession(locals.session.id);

		// ═══════════════════════════════════════════════════════════════════
		// Step 3: Clear the session cookie
		// ═══════════════════════════════════════════════════════════════════
		// Create a blank cookie (expires immediately) to replace the old one.
		const sessionCookie = lucia.createBlankSessionCookie();
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});

		// ═══════════════════════════════════════════════════════════════════
		// Step 4: Redirect to home page
		// ═══════════════════════════════════════════════════════════════════
		redirect(302, '/');
	}
};
