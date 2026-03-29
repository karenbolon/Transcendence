import type { Actions, PageServerLoad } from './$types';
import { fail, redirect, isRedirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { lucia } from '$lib/server/auth/lucia';
import { verifyPassword } from '$lib/server/auth/password';
import { redirectIfLoggedIn, createAndSetSession } from '$lib/server/auth/helpers';
import { generateOAuthState, buildOAuthAuthorizationUrl } from '$lib/server/auth/oauth';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	redirectIfLoggedIn(locals);
	return {};
};

export const actions: Actions = {
	password: async ({ request, cookies }) => {

		const formData = await request.formData();

		const username = formData.get('username')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		if (!username || !password) {
			return fail(400, {
errorKey: 'errors.all_fields_required',
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
errorKey: 'errors.invalid_credentials',
username
});
		}

		if (!user.password_hash) {
			return fail(400, {
errorKey: 'errors.oauth_only_account',
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
errorKey: 'errors.invalid_credentials',
username
});
		}

		await createAndSetSession(user.id, cookies);
		redirect(302, '/');
	},
	github: async () => {
		try {
			const state = await generateOAuthState();
			const authUrl = buildOAuthAuthorizationUrl('github', state);
			redirect(302, authUrl);
		} catch (err) {
			if (isRedirect(err)) throw err;
			console.error('GitHub OAuth error:', err);
			return fail(500, { errorKey: 'errors.server_error' });
		}
	},
	oauth42: async () => {
		try {
			const state = await generateOAuthState();
			const authUrl = buildOAuthAuthorizationUrl('42', state);
			redirect(302, authUrl);
		} catch (err) {
			if (isRedirect(err)) throw err;
			console.error('42 OAuth error:', err);
			return fail(500, { errorKey: 'errors.server_error' });
		}
	}
};