import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, hashPassword } from '$lib/server/auth/password';
import { validatePassword } from '$lib/server/auth/validation';

export const POST: RequestHandler = async ({ request, locals }) => {
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

	const { currentPassword, newPassword } = body as {
		currentPassword?: string;
		newPassword?: string;
	};

	if (!currentPassword || !newPassword) {
		return json({ error: 'All fields are required' }, { status: 400 });
	}

	const validation = validatePassword(newPassword);
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

	if (!user.password_hash) {
		return json({ error: 'This account uses OAuth — cannot change password' }, { status: 400 });
	}
	const isValid = await verifyPassword(user.password_hash, currentPassword);
	if (!isValid) {
		return json({ error: 'Current password is incorrect' }, { status: 400 });
	}

	const newHash = await hashPassword(newPassword);
	await db
		.update(users)
		.set({ password_hash: newHash, updated_at: new Date() })
		.where(eq(users.id, userId));

	return json({ success: true });
};