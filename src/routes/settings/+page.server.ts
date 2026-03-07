import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, "/login");
	}

	const userId = Number(locals.user.id);
	const [user] = await db
		.select({
		username: users.username,
		email: users.email,
		notification_prefs: users.notification_prefs,
		})
		.from(users)
		.where(eq(users.id, userId));

	if (!user) {
		throw redirect(302, "/login");
	}

	//default preferences
	const defaultPrefs = {
		friendRequests: true,
		gameInvites: true,
		matchResults: true, 
	};

	//Api keys

	return {
		username: user.username,
		email: user.email,
		notificationPrefs: (user.notification_prefs as typeof defaultPrefs) ?? defaultPrefs,
		//apikeys
	};
};
