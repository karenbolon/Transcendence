import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { lucia } from '$lib/server/auth/lucia';
import { verifyPassword } from '$lib/server/auth/password';
import { redirectIfLoggedIn, createAndSetSession } from '$lib/server/auth/helpers';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	redirectIfLoggedIn(locals);
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

		if (!user.password_hash) {
			return fail(400, { error: 'This account uses OAuth — please sign in with your provider' });
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

		await createAndSetSession(user.id, cookies);
		redirect(302, '/');
	}
};