import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULTS_DIR = path.resolve('static/avatars/defaults');

export const GET: RequestHandler = async () => {
	try {
		const urls: string[] = [];

		for (const entry of fs.readdirSync(DEFAULTS_DIR, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				const subdir = path.join(DEFAULTS_DIR, entry.name);
				const files = fs.readdirSync(subdir)
					.filter((f) => /\.(svg|png|jpg|jpeg|webp)$/i.test(f))
					.sort();
				for (const f of files) {
					urls.push(`/avatars/defaults/${entry.name}/${f}`);
				}
			} else if (/\.(svg|png|jpg|jpeg|webp)$/i.test(entry.name)) {
				urls.push(`/avatars/defaults/${entry.name}`);
			}
		}

		return json(urls);
	} catch {
		return json([]);
	}
};