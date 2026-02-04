// src/lib/server/auth/password.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../password';

describe('Password Hashing', () => {
	// ══════════════════════════════════════════════════════════════════════════
	// 🔐 hashPassword tests
	// ══════════════════════════════════════════════════════════════════════════
	describe('hashPassword', () => {
		it('should hash a password', async () => {
			const password = 'mySecurePassword123!';
			const hashed = await hashPassword(password);

			expect(hashed).toBeDefined();
			expect(typeof hashed).toBe('string');
			expect(hashed).not.toBe(password); // Hash should differ from original
			expect(hashed.length).toBeGreaterThan(0);
		});

		it('should create different hashes for the same password (salting)', async () => {
			const password = 'samePassword';

			const hash1 = await hashPassword(password);
			const hash2 = await hashPassword(password);

			// Each hash should be unique due to random salt
			expect(hash1).not.toBe(hash2);
		});

		it('should create different hashes for different passwords', async () => {
			const hash1 = await hashPassword('password1');
			const hash2 = await hashPassword('password2');

			expect(hash1).not.toBe(hash2);
		});

		it('should handle empty password', async () => {
			const hashed = await hashPassword('');

			expect(hashed).toBeDefined();
			expect(typeof hashed).toBe('string');
		});

		it('should handle very long passwords', async () => {
			const longPassword = 'a'.repeat(1000);
			const hashed = await hashPassword(longPassword);

			expect(hashed).toBeDefined();
			expect(typeof hashed).toBe('string');
		});

		it('should handle special characters', async () => {
			const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?émojis🔐';
			const hashed = await hashPassword(specialPassword);

			expect(hashed).toBeDefined();
			expect(typeof hashed).toBe('string');
		});

		it('should handle unicode characters', async () => {
			const unicodePassword = '密码パスワード🔑';
			const hashed = await hashPassword(unicodePassword);

			expect(hashed).toBeDefined();
			// Verify it works with the unicode password
			const isValid = await verifyPassword(hashed, unicodePassword);
			expect(isValid).toBe(true);
		});

		it('should show hash format', async () => {
			const password = 'ExamplePassword123';
			const hash = await hashPassword(password);

			expect(hash).toMatch(/^\$argon2id\$/); // Starts with $argon2id$

			console.log('📝 Example hash:', hash);
			console.log('📏 Hash length:', hash.length);
		});
	});

	// ══════════════════════════════════════════════════════════════════════════
	// ✅ verifyPassword tests
	// ══════════════════════════════════════════════════════════════════════════
	describe('verifyPassword', () => {
		it('should return true for correct password', async () => {
			const password = 'correctPassword123';
			const hashed = await hashPassword(password);

			const isValid = await verifyPassword(hashed, password);

			expect(isValid).toBe(true);
		});

		it('should return false for incorrect password', async () => {
			const password = 'correctPassword';
			const hashed = await hashPassword(password);

			const isValid = await verifyPassword(hashed, 'wrongPassword');

			expect(isValid).toBe(false);
		});

		it('should return false for similar but different password', async () => {
			const password = 'MyPassword123';
			const hashed = await hashPassword(password);

			// Test case sensitivity
			expect(await verifyPassword(hashed, 'mypassword123')).toBe(false);
			expect(await verifyPassword(hashed, 'MyPassword124')).toBe(false);
			expect(await verifyPassword(hashed, 'MyPassword123 ')).toBe(false);
		});

		it('should return false for invalid hash format', async () => {
			const isValid = await verifyPassword('not-a-valid-hash', 'password');

			expect(isValid).toBe(false);
		});

		it('should return false for empty hash', async () => {
			const isValid = await verifyPassword('', 'password');

			expect(isValid).toBe(false);
		});

		it('should handle empty password verification', async () => {
			const hashed = await hashPassword('');

			expect(await verifyPassword(hashed, '')).toBe(true);
			expect(await verifyPassword(hashed, 'not-empty')).toBe(false);
		});

		it('should verify special characters correctly', async () => {
			const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
			const hashed = await hashPassword(specialPassword);

			expect(await verifyPassword(hashed, specialPassword)).toBe(true);
			expect(await verifyPassword(hashed, '!@#$%^&*()')).toBe(false);
		});
	});

	// ══════════════════════════════════════════════════════════════════════════
	// 🔄 Integration / Real-world scenarios
	// ══════════════════════════════════════════════════════════════════════════
	describe('Real-world scenarios', () => {
		it('should work for typical user registration flow', async () => {
			// User registers with password
			const userPassword = 'MySecureP@ssw0rd!';
			const storedHash = await hashPassword(userPassword);

			// Later, user logs in with correct password
			const loginAttempt = 'MySecureP@ssw0rd!';
			const isAuthenticated = await verifyPassword(storedHash, loginAttempt);

			expect(isAuthenticated).toBe(true);
		});

		it('should reject login with wrong password', async () => {
			const userPassword = 'MySecureP@ssw0rd!';
			const storedHash = await hashPassword(userPassword);

			// Attacker tries wrong password
			const attackAttempt = 'WrongPassword123';
			const isAuthenticated = await verifyPassword(storedHash, attackAttempt);

			expect(isAuthenticated).toBe(false);
		});

		it('should handle password change flow', async () => {
			// Original password
			const oldPassword = 'OldPassword123';
			const oldHash = await hashPassword(oldPassword);

			// User changes password
			const newPassword = 'NewPassword456';
			const newHash = await hashPassword(newPassword);

			// Old password should not work with new hash
			expect(await verifyPassword(newHash, oldPassword)).toBe(false);

			// New password should work with new hash
			expect(await verifyPassword(newHash, newPassword)).toBe(true);

			// New password should not work with old hash
			expect(await verifyPassword(oldHash, newPassword)).toBe(false);
		});
	});
	describe('Security properties', () => {
		it('should be slow enough to prevent brute force', async () => {
			const password = 'TestPassword123';

			const startTime = Date.now();
			await hashPassword(password);
			const endTime = Date.now();

			const duration = endTime - startTime;

			// Should take at least 50ms (usually 100-200ms)
			expect(duration).toBeGreaterThan(50);

			console.log(`✅ Hashing took ${duration}ms (good for security)`);
		});
	});
});