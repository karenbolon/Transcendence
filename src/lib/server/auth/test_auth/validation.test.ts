// src/lib/server/auth/test_auth/validation.test.ts
import { describe, it, expect } from 'vitest';
import {
	validateUsername,
	validateEmail,
	validatePassword,
	validateRegistration,
	usernameSchema,
	emailSchema,
	passwordSchema,
	registrationSchema
} from '../validation';

describe('Input Validation', () => {
	// ══════════════════════════════════════════════════════════════════════════
	// 🔤 Username Validation
	// ══════════════════════════════════════════════════════════════════════════
	describe('validateUsername', () => {
		describe('Valid usernames', () => {
			it('should accept valid usernames', () => {
				const validUsernames = [
					'alice',
					'bob123',
					'charlie_smith',
					'diana-jones',
					'eve_123',
					'frank-456',
					'aaa', // Min length (3)
					'a'.repeat(50) // Max length (50)
				];

				validUsernames.forEach((username) => {
					const result = validateUsername(username);
					expect(result.success).toBe(true);
					expect(result.error).toBeUndefined();
				});
			});
		});

		describe('Invalid usernames', () => {
			it('should reject usernames that are too short', () => {
				const result = validateUsername('ab');
				expect(result.success).toBe(false);
				expect(result.error).toContain('at least 3 characters');
			});

			it('should reject usernames that are too long', () => {
				const result = validateUsername('a'.repeat(51));
				expect(result.success).toBe(false);
				expect(result.error).toContain('at most 50 characters');
			});

			it('should reject usernames that start with a number', () => {
				const result = validateUsername('123alice');
				expect(result.success).toBe(false);
				expect(result.error).toContain('must start with a letter');
			});

			it('should reject username starting with underscore', () => {
				const result = validateUsername('_alice');
				expect(result.success).toBe(false);
				expect(result.error).toBe('Username must start with a letter');
			});

			it('should reject usernames with spaces', () => {
				const result = validateUsername('alice smith');
				expect(result.success).toBe(false);
				expect(result.error).toContain('can only contain');
			});

			it('should reject usernames with special characters', () => {
				const invalidUsernames = [
					'alice@home',
					'bob!',
					'charlie#',
					'diana$',
					'eve%',
					'frank&',
					'alice.smith'
				];

				invalidUsernames.forEach((username) => {
					const result = validateUsername(username);
					expect(result.success).toBe(false);
					expect(result.error).toContain('can only contain');
				});
			});

			it('should reject empty username', () => {
				const result = validateUsername('');
				expect(result.success).toBe(false);
			});
		});
	});

	// ══════════════════════════════════════════════════════════════════════════
	// 📧 Email Validation
	// ══════════════════════════════════════════════════════════════════════════
	describe('validateEmail', () => {
		describe('Valid emails', () => {
			it('should accept valid email addresses', () => {
				const validEmails = [
					'alice@example.com',
					'bob.smith@company.co.uk',
					'charlie+test@domain.org',
					'diana_jones@sub.domain.com',
					'eve123@test.io',
					'alice@my-company.com'
				];

				validEmails.forEach((email) => {
					const result = validateEmail(email);
					expect(result.success).toBe(true);
					expect(result.error).toBeUndefined();
				});
			});
		});

		describe('Invalid emails', () => {
			it('should reject emails without @', () => {
				const result = validateEmail('notanemail');
				expect(result.success).toBe(false);
				expect(result.error).toContain('Invalid email');
			});

			it('should reject emails without domain', () => {
				const result = validateEmail('alice@');
				expect(result.success).toBe(false);
				expect(result.error).toContain('Invalid email');
			});

			it('should reject emails without username', () => {
				const result = validateEmail('@example.com');
				expect(result.success).toBe(false);
				expect(result.error).toContain('Invalid email');
			});

			it('should reject empty email', () => {
				const result = validateEmail('');
				expect(result.success).toBe(false);
				expect(result.error).toContain('required');
			});

			it('should reject empty email', () => {
				const result = validateEmail('');
				expect(result.success).toBe(false);
				expect(result.error).toBe('Email is required');
			});

			it('should reject email with double dots', () => {
				const result = validateEmail('alice..smith@example.com');
				expect(result.success).toBe(false);
			});

			it('should reject emails that are too long', () => {
				const longEmail = 'a'.repeat(250) + '@example.com';
				const result = validateEmail(longEmail);
				expect(result.success).toBe(false);
				expect(result.error).toContain('at most 255 characters');
			});
		});
	});

	// ══════════════════════════════════════════════════════════════════════════
	// 🔐 Password Validation
	// ══════════════════════════════════════════════════════════════════════════
	describe('validatePassword', () => {
		describe('Valid passwords', () => {
			it('should accept valid passwords', () => {
				const validPasswords = [
					'Password123',
					'MySecure99!',
					'Abcd1234',
					'Test123Pass',
					'SecureP@ss1',
					'Password1!@#'
				];

				validPasswords.forEach((password) => {
					const result = validatePassword(password);
					expect(result.success).toBe(true);
					expect(result.error).toBeUndefined();
				});
			});

			it('should accept long password', () => {
				expect(validatePassword('Password1' + 'a'.repeat(55)).success).toBe(true);
			});

		});

		describe('Invalid passwords', () => {
			it('should reject passwords that are too short', () => {
				const result = validatePassword('Pass1');
				expect(result.success).toBe(false);
				expect(result.error).toContain('at least 8 characters');
			});

			it('should reject passwords without lowercase letter', () => {
				const result = validatePassword('PASSWORD123');
				expect(result.success).toBe(false);
				expect(result.error).toContain('lowercase letter');
			});

			it('should reject passwords without uppercase letter', () => {
				const result = validatePassword('password123');
				expect(result.success).toBe(false);
				expect(result.error).toContain('uppercase letter');
			});

			it('should reject passwords without number', () => {
				const result = validatePassword('PasswordABC');
				expect(result.success).toBe(false);
				expect(result.error).toContain('number');
			});

			it('should reject empty password', () => {
				const result = validatePassword('');
				expect(result.success).toBe(false);
			});

			it('should reject password longer than 64 characters', () => {
				const longPassword = 'Aa1' + 'a'.repeat(62);
				const result = validatePassword(longPassword);
				expect(result.success).toBe(false);
				expect(result.error).toBe('Password must be at most 64 characters');
			});
		});
	});

	// ══════════════════════════════════════════════════════════════════════════
	// 📝 Complete Registration Validation
	// ══════════════════════════════════════════════════════════════════════════
	describe('validateRegistration', () => {
		it('should accept valid registration data', () => {
			const result = validateRegistration({
				username: 'alice',
				email: 'alice@example.com',
				password: 'MyPassword123'
			});

			expect(result.success).toBe(true);
			expect(result.errors).toBeUndefined();
		});

		it('should reject registration with invalid username', () => {
			const result = validateRegistration({
				username: 'al', // Too short
				email: 'alice@example.com',
				password: 'MyPassword123'
			});

			expect(result.success).toBe(false);
			expect(result.errors?.username).toBe('Username must be at least 3 characters');
			expect(result.errors?.email).toBeUndefined();
			expect(result.errors?.password).toBeUndefined();
		});

		it('should reject registration with invalid email', () => {
			const result = validateRegistration({
				username: 'alice',
				email: 'not-an-email', // Invalid
				password: 'MyPassword123'
			});

			expect(result.success).toBe(false);
			expect(result.errors?.username).toBeUndefined();
			expect(result.errors?.email).toBe('Invalid email format');
			expect(result.errors?.password).toBeUndefined();
		});

		it('should reject registration with invalid password', () => {
			const result = validateRegistration({
				username: 'alice',
				email: 'alice@example.com',
				password: 'weak' // Too short, no uppercase, no number
			});

			expect(result.success).toBe(false);
			expect(result.errors?.username).toBeUndefined();
			expect(result.errors?.email).toBeUndefined();
			expect(result.errors?.password).toBeDefined();
		});

		it('should return all errors for multiple invalid fields', () => {
			const result = validateRegistration({
				username: 'a', // Too short
				email: 'bad-email', // Invalid
				password: '123' // Too short, no letters
			});

			expect(result.success).toBe(false);
			expect(result.errors?.username).toBeDefined();
			expect(result.errors?.email).toBeDefined();
			expect(result.errors?.password).toBeDefined();
		});

		it('should return all errors for completely empty data', () => {
			const result = validateRegistration({
				username: '',
				email: '',
				password: ''
			});

			expect(result.success).toBe(false);
			expect(result.errors?.username).toBeDefined();
			expect(result.errors?.email).toBeDefined();
			expect(result.errors?.password).toBeDefined();
		});
	});

	// ══════════════════════════════════════════════════════════════════════════
	// 📐 Schema exports (for use with Zod directly)
	// ══════════════════════════════════════════════════════════════════════════
	describe('Schema exports', () => {
		it('should export usernameSchema', () => {
			expect(usernameSchema).toBeDefined();
			expect(usernameSchema.safeParse('validuser').success).toBe(true);
		});

		it('should export emailSchema', () => {
			expect(emailSchema).toBeDefined();
			expect(emailSchema.safeParse('test@example.com').success).toBe(true);
		});

		it('should export passwordSchema', () => {
			expect(passwordSchema).toBeDefined();
			expect(passwordSchema.safeParse('Password1').success).toBe(true);
		});

		it('should export registrationSchema', () => {
			expect(registrationSchema).toBeDefined();
			expect(registrationSchema.safeParse({
				username: 'alice',
				email: 'alice@example.com',
				password: 'Password1'
			}).success).toBe(true);
		});
	});

	// ══════════════════════════════════════════════════════════════════════════
	// 🌍 Real-world edge cases
	// ══════════════════════════════════════════════════════════════════════════
	describe('Edge cases', () => {
		it('should handle whitespace-only username', () => {
			expect(validateUsername('   ').success).toBe(false);
		});

		it('should handle whitespace-only email', () => {
			expect(validateEmail('   ').success).toBe(false);
		});

		it('should handle whitespace-only password', () => {
			expect(validatePassword('        ').success).toBe(false);
		});

		it('should handle unicode in username (should reject)', () => {
			expect(validateUsername('àlice').success).toBe(false);
		});

		it('should handle SQL injection attempt in username', () => {
			expect(validateUsername("'; DROP TABLE users;--").success).toBe(false);
		});

		it('should handle XSS attempt in username', () => {
			expect(validateUsername('<script>alert("xss")</script>').success).toBe(false);
		});
	});

});