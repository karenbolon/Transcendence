import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { lucia } from '$lib/server/auth/lucia';
import { verifyPassword } from '$lib/server/auth/password';
import { requireAuth, clearSessionCookie } from '$lib/server/auth/helpers';
import { eq } from 'drizzle-orm';

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		// ── AUTH GUARD ──────────────────────────────────────────────
		if (!locals.user || !locals.session) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const password = formData.get('password')?.toString() ?? '';

		if (!password) {
			return fail(400, { errorKey: 'common.password_required' });
		}

		// ── FETCH FULL USER (need password_hash) ───────────────────
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, Number(locals.user.id)));

		if (!user) {
			throw redirect(302, '/login');
		}

		// ── VERIFY PASSWORD ────────────────────────────────────────
		// OAuth-only users cannot delete via password
		if (!user.password_hash) {
			return fail(400, { 
				errorKey: 'errors.oauth_only_account'
			});
		}

		const valid = await verifyPassword(user.password_hash, password);
		if (!valid) {
			return fail(400, { 
				errorKey: 'errors.incorrect_password'
			});
		}

		// ── SOFT DELETE + ANONYMIZE ─────────────────────────────────
		// Anonymize username/email so the UNIQUE constraints free up
		// the original values for potential re-registration.
		const now = new Date();
		const anonSuffix = `deleted_${user.id}_${now.getTime()}`;

		await db.transaction(async (tx) => {
			await tx
				.update(users)
				.set({
					is_deleted: true,
					deleted_at: now,
					is_online: false,
					username: anonSuffix,
					email: `${anonSuffix}@deleted.local`
				})
				.where(eq(users.id, user.id));
		});

		// ── INVALIDATE ALL SESSIONS ────────────────────────────────
		await lucia.invalidateUserSessions(String(user.id));

		// ── CLEAR COOKIE ───────────────────────────────────────────
		clearSessionCookie(cookies);

		throw redirect(302, '/');
	}
};
