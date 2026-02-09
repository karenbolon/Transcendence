// src/lib/server/auth/lucia.ts
import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';  // ← CORRECTED!
import { dev } from '$app/environment';
import { db } from '$lib/server/db/index';
import { users, sessions } from '$lib/server/db/schema';
// import type { User as DatabaseUser } from '$lib/server/db/schema';

// Create the adapter (connects Lucia to our database)
const adapter = new DrizzlePostgreSQLAdapter(db, sessions as any, users as any);

// Initialize Lucia with our configuration
export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			// Set secure to false in development (http), true in production (https)
			secure: !dev
		}
	},
	getUserAttributes: (attributes) => {
		return {
			username: attributes.username,
			email: attributes.email,
			name: attributes.name
			// displayName: attributes.displayName,
			// avatar: attributes.avatar,
			// emailVerified: attributes.emailVerified
		};
	}
});

// TypeScript types for Lucia
declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUser;
	}
}

interface DatabaseUser {
	username: string;
	email: string;
	name: string;
}

// export type SessionValidationResult = Awaited<ReturnType<typeof lucia.validateSession>>;