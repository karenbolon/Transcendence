import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { lucia } from '$lib/server/auth/lucia';
import { verifyPassword } from '$lib/server/auth/password';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// Already logged in? Go to dashboard
	if (locals.user) {
		redirect(302, '/dashboard');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		// ═══════════════════════════════════════════════════════════════════
		// Step 1: Extract form data
		// ═══════════════════════════════════════════════════════════════════
		const formData = await request.formData();

		const username = formData.get('username')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		// ═══════════════════════════════════════════════════════════════════
		// Step 2: Basic validation (are the fields filled in?)
		// ═══════════════════════════════════════════════════════════════════
		if (!username || !password) {
			return fail(400, {
				error: 'Please fill in all fields',
				username
			});
		}

		// ═══════════════════════════════════════════════════════════════════
		// Step 3: Find the user in the database
		// ═══════════════════════════════════════════════════════════════════
		// We search by username. If not found → generic error.
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.username, username))
			.limit(1);

		if (!user) {
			// SECURITY: Don't say "username not found" — say generic message
			// This prevents username enumeration attacks
			return fail(400, {
				error: 'Invalid username or password',
				username
			});
		}

		// ═══════════════════════════════════════════════════════════════════
		// Step 4: Verify the password
		// ═══════════════════════════════════════════════════════════════════
		// Compare the submitted password against the stored hash.
		// verifyPassword returns true/false — never throws for wrong password.
		const validPassword = await verifyPassword(
			user.password_hash,
			password
		);

		if (!validPassword) {
			// SECURITY: Same generic message as above
			return fail(400, {
				error: 'Invalid username or password',
				username
			});
		}

		// ═══════════════════════════════════════════════════════════════════
		// Step 5: Create session (log the user in)
		// ═══════════════════════════════════════════════════════════════════
		// Password is correct! Create a session and set the cookie.
		// try {
			const session = await lucia.createSession(String(user.id), {});
			const sessionCookie = lucia.createSessionCookie(session.id);

			cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});

			await db
				.update(users)
				.set({ is_online: true })
				.where(eq(users.id, user.id));
		// } catch (err) {
			// console.error('Login session error:', err);
			// return fail(500, {
			// 	error: 'Something went wrong. Please try again.',
			// 	username
			// });
		// }

		// ═══════════════════════════════════════════════════════════════════
		// Step 6: Redirect to dashboard
		// ═══════════════════════════════════════════════════════════════════
		redirect(302, '/dashboard');
	}
};
