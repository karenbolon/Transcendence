import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If not logged in, send them to login
	if (!locals.user) {
		redirect(302, '/login');
	}

	// User is logged in — pass their data to the page
	return {
		user: locals.user
	};
};
