import { fail, redirect, isRedirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
// import { lucia } from '$lib/server/auth/lucia';
import { hashPassword } from '$lib/server/auth/password';
import { validateRegistration } from '$lib/server/auth/validation';
import { validateRegistrationUniqueness } from '$lib/server/auth/db_valid';
import { redirectIfLoggedIn, createAndSetSession } from '$lib/server/auth/helpers';
import { generateOAuthState, buildOAuthAuthorizationUrl } from '$lib/server/auth/oauth';
import { authLogger } from '$lib/server/logger';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
// import { eq } from 'drizzle-orm';
import type { FormErrors } from '$lib/types/form';


export const load: PageServerLoad = async ({ locals }) => {
	redirectIfLoggedIn(locals);
	return {};
};

export const actions: Actions = {
	password: async ({ request, cookies }) => {
		const formData = await request.formData();

		const username = formData.get('username')?.toString().trim().toLowerCase() ?? '';
		const email = formData.get('email')?.toString().trim().toLowerCase() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';
		const acceptTerms = formData.get('acceptTerms') === 'on'; // Checkbox value is "on" when checked

		if (!acceptTerms) {
			return fail(400, {
				error: 'You must accept the Terms of Service and Privacy Policy',
				errors: {} as FormErrors
			});
		}
		if (password !== confirmPassword) {
			return fail(400, {
				error: undefined,
				errors: { confirmPassword: 'Passwords do not match' } as FormErrors
			});
		}

		const formatValidation = validateRegistration({ username, email, password });

		if (!formatValidation.success) {
			return fail(400, {
				error: undefined,
				errors: (formatValidation.errors ?? {}) as FormErrors
			});
		}

		const uniquenessCheck = await validateRegistrationUniqueness({ username, email });

		if (!uniquenessCheck.success) {
			return fail(400, {
				error: undefined,
				errors: (uniquenessCheck.errors ?? {}) as FormErrors
			});
		}

		try {
			const passwordHash = await hashPassword(password);

			const [newUser] = await db
				.insert(users)
				.values({
					username,
					name: username, // Use username as display name initially
					email,
					password_hash: passwordHash,
					terms_accepted_at: new Date()
				})
				.returning({ id: users.id });

			await createAndSetSession(newUser.id, cookies);
		} catch (err) {
			authLogger.error({ err }, 'Registration error');

			return fail(500, {
				error: 'Something went wrong. Please try again.',
				errors: {} as FormErrors
			});
		}

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
			return fail(500, { errorKey: 'errors.server_error', errors: {} as FormErrors });
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
			return fail(500, { errorKey: 'errors.server_error', errors: {} as FormErrors });
		}
	}
};
