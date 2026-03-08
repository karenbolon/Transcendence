import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function getUploadsDir(): string {
	if (dev) {
		return path.resolve('static/avatars/uploads');
	}
	const serverDir = path.dirname(fileURLToPath(import.meta.url));
		return path.resolve(serverDir, '../../client/avatars/uploads');
}

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const userId = Number(locals.user.id);

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return json({ error: 'Invalid form data' }, { status: 400 });
	}

	const file = formData.get('avatar');

	if (!file || !(file instanceof File)) {
		return json({ error: 'No file provided' }, { status: 400 });
	}

	if (!ALLOWED_TYPES.includes(file.type)) {
		return json({ error: 'File must be PNG, JPEG, or WebP' }, { status: 400 });
	}

	if (file.size > MAX_SIZE) {
		return json({ error: 'File must be 2MB or less' }, { status: 400 });
	}

	try {
		const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
		const filename = `${userId}-${Date.now()}.${ext}`;
		const uploadDir = getUploadsDir();
		const filepath = join(uploadDir, filename);

		// Ensure upload directory exists
		await mkdir(uploadDir, { recursive: true });

		// Delete previous uploads for this user
		try {
			const files = await readdir(uploadDir);
			const oldFiles = files.filter(f => f.startsWith(`${userId}-`));
			await Promise.all(oldFiles.map(f => unlink(join(uploadDir, f))));
		} catch {
			// Ignore cleanup errors
		}

		// Write file
		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(filepath, buffer);

		const url = `/avatars/uploads/${filename}`;

		return json({ url });
	} catch (err) {
		console.error('Failed to upload avatar:', err);
		return json({ error: 'Failed to upload avatar' }, { status: 500 });
	}
};