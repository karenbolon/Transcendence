import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { readdir, unlink } from 'fs/promises';
import { join } from 'path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function getUploadsDir(): string {
	if (dev) {
		return path.resolve('static/avatars/uploads');
	}
	const serverDir = path.dirname(fileURLToPath(import.meta.url));
	return path.resolve(serverDir, '../../client/avatars/uploads');
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const userId = Number(locals.user.id);

	try {
		const uploadDir = getUploadsDir();
		const files = await readdir(uploadDir);

		// Only return files belonging to this user
		const userFiles = files
			.filter(f => f.startsWith(`${userId}-`))
			.sort() // oldest first
			.map(f => `/avatars/uploads/${f}`);

		return json(userFiles);
	} catch {
		// Directory might not exist yet = no uploads
		return json([]);
	}
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const userId = Number(locals.user.id);
	const { url } = await request.json();

	// Extract filename and verify it belongs to this user
	const filename = url.split('/').pop();
	if (!filename || !filename.startsWith(`${userId}-`)) {
		return json({ error: 'Not authorized' }, { status: 403 });
	}

	try {
		const uploadDir = getUploadsDir();
		await unlink(join(uploadDir, filename));
		return json({ success: true });
	} catch {
		return json({ error: 'File not found' }, { status: 404 });
	}
};