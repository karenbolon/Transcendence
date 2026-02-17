import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { lucia } from '$lib/server/auth/lucia';
import { verifyPassword } from '$lib/server/auth/password';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		redirect(302, '/dashboard');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {

		const formData = await request.formData();

		const username = formData.get('username')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		if (!username || !password) {
			return fail(400, {
				error: 'Please fill in all fields',
				username
			});
		}
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.username, username))
			.limit(1);

		if (!user || user.is_deleted) {
			return fail(400, {
				error: 'Invalid username or password',
				username
			});
		}

		const validPassword = await verifyPassword(
			user.password_hash,
			password
		);

		if (!validPassword) {
			return fail(400, {
				error: 'Invalid username or password',
				username
			});
		}

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

		redirect(302, '/dashboard');
	}
};
