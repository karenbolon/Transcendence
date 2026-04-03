import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '$lib/server/auth/password';
import { validateEmail } from '$lib/server/auth/validation';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const userId = Number(locals.user.id);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request' }, { status: 400 });
	}

	const { newEmail, password } = body as {
		newEmail?: string;
		password?: string;
	};

	if (!newEmail || !password) {
		return json({ error: 'All fields are required' }, { status: 400 });
	}

	const validation = validateEmail(newEmail);
	if (!validation.success) {
		return json({ error: validation.error }, { status: 400 });
	}

	const [user] = await db
		.select({ password_hash: users.password_hash })
		.from(users)
		.where(eq(users.id, userId));

	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	// OAuth-only users cannot change email via password verification
	if (!user.password_hash) {
		return json({ error: 'OAuth-only accounts cannot change email this way' }, { status: 400 });
	}

	const valid = await verifyPassword(user.password_hash, password);
	if (!valid) {
		return json({ error: 'Password is incorrect' }, { status: 400 });
	}

	try {
		await db
			.update(users)
			.set({ email: newEmail.trim().toLowerCase(), updated_at: new Date() })
			.where(eq(users.id, userId));

		return json({ success: true, email: newEmail.trim().toLowerCase() });
	} catch (err: any) {
		if (err?.code === '23505') {
			return json({ error: 'This email is already in use' }, { status: 409 });
		}
		return json({ error: 'Failed to update email' }, { status: 500 });
	}
};
