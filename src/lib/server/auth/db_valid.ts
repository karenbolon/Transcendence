// src/lib/server/auth/db-validation.ts
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// ══════════════════════════════════════════════════════════════════════════════
// 🔍 Database Uniqueness Checks
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a username already exists in the database
 * @param username - Username to check
 * @returns true if username is taken, false if available
 */
export async function isUsernameTaken(username: string): Promise<boolean> {
	const existing = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.username, username), eq(users.is_deleted, false)))
		.limit(1);

	return existing.length > 0;
}

/**
 * Check if an email already exists in the database
 * @param email - Email to check
 * @returns true if email is taken, false if available
 */
export async function isEmailTaken(email: string): Promise<boolean> {
	const existing = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.email, email), eq(users.is_deleted, false)))
		.limit(1);

	return existing.length > 0;
}

/**
 * Check if username is available (inverse of isUsernameTaken)
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
	return !(await isUsernameTaken(username));
}

/**
 * Check if email is available (inverse of isEmailTaken)
 */
export async function isEmailAvailable(email: string): Promise<boolean> {
	return !(await isEmailTaken(email));
}

/**
 * Validate registration data against database constraints
 * Call this AFTER format validation passes
 * @param data - Object with username and email
 * @returns Object with success status and errors if any fields are taken
 */
export async function validateRegistrationUniqueness(data: {
	username: string;
	email: string;
}): Promise<{
	success: boolean;
	errors?: {
		username?: string;
		email?: string;
	};
}> {
	const errors: { username?: string; email?: string } = {};

	// Check both in parallel for better performance
	const [usernameTaken, emailTaken] = await Promise.all([
		isUsernameTaken(data.username),
		isEmailTaken(data.email)
	]);

	if (usernameTaken) {
		errors.username = 'Username is already taken';
	}

	if (emailTaken) {
		errors.email = 'Email is already registered';
	}

	if (Object.keys(errors).length > 0) {
		return { success: false, errors };
	}

	return { success: true };
}