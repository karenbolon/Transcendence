import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	if (event.locals.user) {
		const path = event.url.pathname;
		if (path === '/login' || path === '/register') {
			redirect(302, '/dashboard');
		}
	}

	return {};
};
