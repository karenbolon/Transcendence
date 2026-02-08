import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	// If user is logged in and trying to access login or register → dashboard
	if (event.locals.user) {
		const path = event.url.pathname;

		// Only redirect for login/register, NOT logout
		if (path === '/login' || path === '/register') {
			redirect(302, '/dashboard');
		}
	}

	return {};
};
