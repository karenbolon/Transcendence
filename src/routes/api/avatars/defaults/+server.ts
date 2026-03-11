import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function getDefaultsDir(): string {
	if (dev) {
		return path.resolve('static/avatars/defaults');
	}
	// Production (adapter-node): server chunks are in build/server/chunks/,
	// static files are in build/client/
	const serverDir = path.dirname(fileURLToPath(import.meta.url));
	return path.resolve(serverDir, '../../client/avatars/defaults');
}

export const GET: RequestHandler = async () => {
	try {
		const dir = getDefaultsDir();
		const groups: Record<string, string[]> = {}
		// const urls: string[] = [];

		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				const subdir = path.join(dir, entry.name);
				const files = fs.readdirSync(subdir)
					.filter((f) => /\.(svg|png|jpg|jpeg|webp)$/i.test(f))
					.sort();

				if (files.length > 0) {
					groups[entry.name] = files.map(f => `/avatars/defaults/${entry.name}/${f}`);
				}
				// for (const f of files) {
				// 	urls.push(`/avatars/defaults/${entry.name}/${f}`);
				// }
			} else if (/\.(svg|png|jpg|jpeg|webp)$/i.test(entry.name)) {
				// urls.push(`/avatars/defaults/${entry.name}`);
				// Loose files go into "general"
				if (!groups['general']) groups['general'] = [];
				groups['general'].push(`/avatars/defaults/${entry.name}`);
			}
		}

		return json(groups);
	} catch {
		return json({});
	}
};