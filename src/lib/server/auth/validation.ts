// src/lib/server/auth/validation.ts
import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════
// 🔤 Username Validation
// ══════════════════════════════════════════════════════════════════════════

export const usernameSchema = z
	.string()
	.min(3, 'Username must be at least 3 characters')
	.max(50, 'Username must be at most 50 characters')
	.regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
	.regex(/^[a-zA-Z]/, 'Username must start with a letter');

/**
 * Validate a username
 * @param username - Username to validate
 * @returns Object with success status and error message if invalid
 */
export function validateUsername(username: string): {
	success: boolean;
	error?: string
} {
	const result = usernameSchema.safeParse(username);

	if (result.success) {
		return { success: true };
	}

	return {
		success: false,
		error: result.error.issues[0].message
	};
}

// ══════════════════════════════════════════════════════════════════════════
// 📧 Email Validation
// ══════════════════════════════════════════════════════════════════════════

export const emailSchema = z
	.string()
	.min(1, 'Email is required')
	.max(255, 'Email must be at most 255 characters')
	.email('Invalid email format');

/**
 * Validate an email address
 * @param email - Email to validate
 * @returns Object with success status and error message if invalid
 */
export function validateEmail(email: string): {
	success: boolean;
	error?: string
} {
	const result = emailSchema.safeParse(email);

	if (result.success) {
		return { success: true };
	}

	return {
		success: false,
		error: result.error.issues[0].message
	};
}

// ══════════════════════════════════════════════════════════════════════════
// 🔐 Password Validation
// ══════════════════════════════════════════════════════════════════════════

export const passwordSchema = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.max(64, 'Password must be at most 64 characters')
	.regex(/[a-z]/, 'Password must contain at least one lowercase letter')
	.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
	.regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Validate a password
 * @param password - Password to validate
 * @returns Object with success status and error message if invalid
 */
export function validatePassword(password: string): {
	success: boolean;
	error?: string
} {
	const result = passwordSchema.safeParse(password);

	if (result.success) {
		return { success: true };
	}

	return {
		success: false,
		error: result.error.issues[0].message
	};
}

// ══════════════════════════════════════════════════════════════════════════
// 📝 Registration Data Validation (All Together!)
// ══════════════════════════════════════════════════════════════════════════

export const registrationSchema = z.object({
	username: usernameSchema,
	email: emailSchema,
	password: passwordSchema
});

export type RegistrationData = z.infer<typeof registrationSchema>;

/**
 * Validate complete registration data
 * @param data - Object containing username, email, and password
 * @returns Object with success status and errors object if invalid
 */
export function validateRegistration(data: {
	username: string;
	email: string;
	password: string;
}): {
	success: boolean;
	errors?: {
		username?: string;
		email?: string;
		password?: string;
	};
} {
	const result = registrationSchema.safeParse(data);

	if (result.success) {
		return { success: true };
	}

	// Convert Zod errors to friendly format
	const errors: {
		username?: string;
		email?: string;
		password?: string;
	} = {};

	for (const error of result.error.issues) {
		const field = error.path[0] as 'username' | 'email' | 'password';
		errors[field] = error.message;
	}

	return {
		success: false,
		errors
	};
}