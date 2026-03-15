import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// This runs on the server before the page renders.
// It ensures the user is logged in and passes the roomId to the client.
export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	return {
		roomId: params.roomId,
		userId: Number(locals.user.id),
		username: locals.user.username,
	};
};
