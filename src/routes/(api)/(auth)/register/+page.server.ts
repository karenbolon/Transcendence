import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { lucia } from '$lib/server/auth/lucia';
import { hashPassword } from '$lib/server/auth/password';
import { validateRegistration } from '$lib/server/auth/validation';
import { validateRegistrationUniqueness } from '$lib/server/auth/db_valid';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { FormErrors } from '$lib/types/form';

export const load: PageServerLoad = async ({ locals }) => {
	// If user is already logged in, redirect to dashboard
	if (locals.user) {
		redirect(302, '/dashboard');
	}

	// Return nothing special for the page
	return {};
};

export const actions: Actions = {
	// ═══════════════════════════════════════════════════════════════════════
	// The "default" action runs when the form is submitted with method="POST"
	// (no action attribute needed on the form — it posts to itself)
	// ═══════════════════════════════════════════════════════════════════════
	default: async ({ request, cookies }) => {
		// ═══════════════════════════════════════════════════════════════════
		// Step 1: Extract form data
		// ═══════════════════════════════════════════════════════════════════
		// request contains the POST request from the browser.
		// formData() extracts the form fields.
		const formData = await request.formData();

		const username = formData.get('username')?.toString().trim() ?? '';
		const email = formData.get('email')?.toString().trim().toLowerCase() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';
		const acceptTerms = formData.get('acceptTerms') === 'on'; // Checkbox value is "on" when checked

		// ═══════════════════════════════════════════════════════════════════
		// Step 2: Check terms acceptance
		// ═══════════════════════════════════════════════════════════════════
		// The checkbox value is "on" when checked, null when unchecked.
		if (!acceptTerms) {
			return fail(400, {
				error: 'You must accept the Terms of Service and Privacy Policy',
				errors: {} as FormErrors
			});
		}

		// ═══════════════════════════════════════════════════════════════════
		// Step 3: Check passwords match
		// ═══════════════════════════════════════════════════════════════════
		if (password !== confirmPassword) {
			return fail(400, {
				error: undefined,
				errors: { confirmPassword: 'Passwords do not match' } as FormErrors
			});
		}

		// ═══════════════════════════════════════════════════════════════════
		// Step 4: Validate format (Zod schemas)
		// ═══════════════════════════════════════════════════════════════════
		// This checks: username format, email format, password strength.
		// Uses the validation functions you already built and tested!
		const formatValidation = validateRegistration({ username, email, password });

		if (!formatValidation.success) {
			// Return the errors to the form so it can display them
			// fail(400, ...) tells SvelteKit "this is a validation error"
			return fail(400, {
				error: undefined,
				errors: (formatValidation.errors ?? {}) as FormErrors
			});
		}

		// ═══════════════════════════════════════════════════════════════════
		// Step 5: Check database uniqueness
		// ═══════════════════════════════════════════════════════════════════
		// Format is valid — now check if username/email are already taken.
		// This uses the db_valid functions you already built and tested!
		const uniquenessCheck = await validateRegistrationUniqueness({ username, email });

		if (!uniquenessCheck.success) {
			return fail(400, {
				error: undefined,
				errors: (uniquenessCheck.errors ?? {}) as FormErrors
			});
		}

		// ═══════════════════════════════════════════════════════════════════
		// Step 6: Create the user
		// ═══════════════════════════════════════════════════════════════════
		// Everything is valid! Now we:
		// 1. Hash the password (never store plain text!)
		// 2. Insert the user into the database
		// 3. Get back the created user (we need the ID for the session)
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

			// ═══════════════════════════════════════════════════════════════
			// Step 7: Create session (auto-login)
			// ═══════════════════════════════════════════════════════════════
			// After registration, we log the user in immediately.
			// Lucia creates a session in the database and gives us a cookie.
			const session = await lucia.createSession(String(newUser.id), {});
			const sessionCookie = lucia.createSessionCookie(session.id);

			// Set the cookie on the response
			// This is what the browser stores and sends back on every request
			cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
			await db
				.update(users)
				.set({ is_online: true })
				.where(eq(users.id, newUser.id));
		} catch (err) {
			// ═══════════════════════════════════════════════════════════════
			// Handle unexpected errors
			// ═══════════════════════════════════════════════════════════════
			// If something goes wrong (database down, constraint violation we
			// didn't catch, etc.), show a generic error message.
			// NEVER show internal error details to the user (security risk).
			console.error('Registration error:', err);

			return fail(500, {
				error: 'Something went wrong. Please try again.',
				errors: {} as FormErrors
			});
		}

		// ═══════════════════════════════════════════════════════════════════
		// Step 8: Redirect to dashboard
		// ═══════════════════════════════════════════════════════════════════
		// Registration successful! Send them to the dashboard.
		// redirect() throws a special SvelteKit redirect (not an error).
		// 302 = temporary redirect (the register page still exists)
		redirect(302, '/dashboard');
	}
};
