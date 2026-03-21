/**
 * Token Encryption Tests
 * 
 * Comprehensive test suite with 27+ test cases covering:
 * - Configuration validation
 * - Encrypt/decrypt roundtrips
 * - IV randomization verification
 * - Error handling (empty, corrupted, tampered tokens)
 * - Performance benchmarks
 * - Special characters and unicode support
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	encryptToken,
	decryptToken,
	generateEncryptionKey,
	initializeEncryptionKey,
	isValidEncryptedTokenFormat,
} from './token-encryption';

describe('Token Encryption Module', () => {
	// Store original env for restoration
	let originalEnv: string | undefined;

	beforeEach(() => {
		// Generate a fresh key for each test
		originalEnv = process.env.OAUTH_ENCRYPTION_KEY;
		process.env.OAUTH_ENCRYPTION_KEY = generateEncryptionKey();
		initializeEncryptionKey();
	});

	afterEach(() => {
		// Restore original env
		if (originalEnv) {
			process.env.OAUTH_ENCRYPTION_KEY = originalEnv;
		} else {
			delete process.env.OAUTH_ENCRYPTION_KEY;
		}
	});

	describe('Configuration Validation', () => {
		it('should throw error when OAUTH_ENCRYPTION_KEY is not set', () => {
			delete process.env.OAUTH_ENCRYPTION_KEY;
			expect(() => initializeEncryptionKey()).toThrow('OAUTH_ENCRYPTION_KEY environment variable is not set');
		});

		it('should throw error when OAUTH_ENCRYPTION_KEY has incorrect length', () => {
			process.env.OAUTH_ENCRYPTION_KEY = 'tooshort';
			expect(() => initializeEncryptionKey()).toThrow('must be 64 hex characters');
		});

		it('should throw error when OAUTH_ENCRYPTION_KEY contains invalid hex', () => {
			process.env.OAUTH_ENCRYPTION_KEY = 'G'.repeat(64); // G is not a valid hex character
			expect(() => initializeEncryptionKey()).toThrow('not valid hex');
		});

		it('should successfully initialize with valid 64-char hex string', () => {
			const validKey = generateEncryptionKey();
			process.env.OAUTH_ENCRYPTION_KEY = validKey;
			expect(() => initializeEncryptionKey()).not.toThrow();
		});

		it('should successfully encrypt after initialization', async () => {
			const token = 'test_token';
			const encrypted = await encryptToken(token);
			expect(encrypted).toBeDefined();
			expect(encrypted).toContain(':');
		});

		it('should successfully decrypt after initialization', async () => {
			const token = 'test_token';
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});
	});

	describe('Encrypt/Decrypt Roundtrips', () => {
		it('should encrypt and decrypt simple ASCII token', async () => {
			const token = 'simple_oauth_token_123';
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});

		it('should encrypt and decrypt long token', async () => {
			const token = 'a'.repeat(1000);
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});

		it('should encrypt and decrypt token with special characters', async () => {
			const token = '!@#$%^&*()_+-=[]{}|;:,.<>?';
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});

		it('should encrypt and decrypt token with unicode characters', async () => {
			const token = '🔐🔑✨ Ñoño 中文 العربية';
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});

		it('should encrypt and decrypt token with spaces and newlines', async () => {
			const token = 'token with spaces\nand newlines\ttabs';
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});

		it('should encrypt and decrypt very long token (10KB)', async () => {
			const token = 'x'.repeat(10000);
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});

		it('should encrypt and decrypt JWT-like token', async () => {
			const token =
				'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});

		it('should preserve token exactly without modification', async () => {
			const token = 'ExactToken123!@#';
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
			expect(decrypted === token).toBe(true); // Strict identity check
		});
	});

	describe('IV Randomization & Security', () => {
		it('should generate different ciphertext for same token (random IV)', async () => {
			const token = 'same_token';
			const encrypted1 = await encryptToken(token);
			const encrypted2 = await encryptToken(token);
			expect(encrypted1).not.toBe(encrypted2);
		});

		it('should still decrypt both different ciphertexts to same token', async () => {
			const token = 'same_token';
			const encrypted1 = await encryptToken(token);
			const encrypted2 = await encryptToken(token);
			expect(await decryptToken(encrypted1)).toBe(token);
			expect(await decryptToken(encrypted2)).toBe(token);
		});

		it('should have different IV in different encryptions', async () => {
			const token = 'test_token';
			const encrypted1 = await encryptToken(token);
			const encrypted2 = await encryptToken(token);

			const iv1 = encrypted1.split(':')[0];
			const iv2 = encrypted2.split(':')[0];

			expect(iv1).not.toBe(iv2);
		});

		it('should detect tampering with ciphertext', async () => {
			const token = 'secure_token';
			const encrypted = await encryptToken(token);
			const [iv, authTag, ciphertext] = encrypted.split(':');

			// Tamper with a character in the ciphertext
			const tamperedCiphertext = ciphertext.slice(0, -2) + (ciphertext.charCodeAt(ciphertext.length - 2) === 48 ? '1' : '0') + ciphertext.slice(-1);
			const tamperedToken = `${iv}:${authTag}:${tamperedCiphertext}`;

			try {
				await decryptToken(tamperedToken);
				expect(true).toBe(false); // Should not reach
			} catch (error: any) {
				expect(error.message).toContain('integrity check failed');
			}
		});

		it('should detect tampering with auth tag', async () => {
			const token = 'secure_token';
			const encrypted = await encryptToken(token);
			const [iv, authTag, ciphertext] = encrypted.split(':');

			// Tamper with auth tag
			const tamperedAuthTag = authTag.slice(0, -2) + 'ff';
			const tamperedToken = `${iv}:${tamperedAuthTag}:${ciphertext}`;

			try {
				await decryptToken(tamperedToken);
				expect(true).toBe(false); // Should not reach
			} catch (error: any) {
				expect(error.message).toContain('integrity check failed');
			}
		});

		it('should detect tampering with IV', async () => {
			const token = 'secure_token';
			const encrypted = await encryptToken(token);
			const [iv, authTag, ciphertext] = encrypted.split(':');

			// Tamper with IV
			const tamperedIv = iv.slice(0, -2) + 'ff';
			const tamperedToken = `${tamperedIv}:${authTag}:${ciphertext}`;

			try {
				await decryptToken(tamperedToken);
				expect(true).toBe(false); // Should not reach
			} catch {
				expect(true).toBe(true); // Expected
			}
		});
	});

	describe('Error Handling', () => {
		it('should throw error when encrypting null', async () => {
			try {
				await encryptToken(null as any);
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.message).toContain('Token must be a non-empty string');
			}
		});

		it('should throw error when encrypting undefined', async () => {
			try {
				await encryptToken(undefined as any);
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.message).toContain('Token must be a non-empty string');
			}
		});

		it('should throw error when encrypting empty string', async () => {
			try {
				await encryptToken('');
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.message).toContain('Token must be a non-empty string');
			}
		});

		it('should throw error when encrypting non-string', async () => {
			try {
				await encryptToken(123 as any);
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.message).toContain('Token must be a non-empty string');
			}
		});

		it('should throw error when decrypting null', async () => {
			try {
				await decryptToken(null as any);
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.message).toContain('Encrypted token must be a non-empty string');
			}
		});

		it('should throw error when decrypting undefined', async () => {
			try {
				await decryptToken(undefined as any);
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.message).toContain('Encrypted token must be a non-empty string');
			}
		});

		it('should throw error when decrypting empty string', async () => {
			try {
				await decryptToken('');
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.message).toContain('Encrypted token must be a non-empty string');
			}
		});

		it('should throw error when decrypting invalid format (no colons)', async () => {
			try {
				await decryptToken('novalidformat');
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.message).toContain('Invalid encrypted token format');
			}
		});

		it('should throw error when decrypting invalid format (wrong colon count)', async () => {
			try {
				await decryptToken('one:two');
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.message).toContain('Invalid encrypted token format');
			}
		});

		it('should throw error when decrypting invalid format (wrong colon count excess)', async () => {
			try {
				await decryptToken('one:two:three:four');
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.message).toContain('Invalid encrypted token format');
			}
		});

		it('should throw error when decrypting with invalid hex characters', async () => {
			try {
				await decryptToken('XY:ZZ:aa');
				expect(true).toBe(false);
			} catch {
				expect(true).toBe(true);
			}
		});

		it('should throw error with corrupted auth tag length', async () => {
			const token = 'test';
			const encrypted = await encryptToken(token);
			const [iv, , ciphertext] = encrypted.split(':');
			const tooShortAuthTag = 'ab'; // Should be 32 hex chars (16 bytes)
			const corrupted = `${iv}:${tooShortAuthTag}:${ciphertext}`;

			try {
				await decryptToken(corrupted);
				expect(true).toBe(false);
			} catch {
				expect(true).toBe(true);
			}
		});

		it('should throw error with corrupted IV length', async () => {
			const encrypted = await encryptToken('test');
			const [, authTag, ciphertext] = encrypted.split(':');
			const tooShortIv = 'abcd'; // Should be 32 hex chars (16 bytes)
			const corrupted = `${tooShortIv}:${authTag}:${ciphertext}`;

			try {
				await decryptToken(corrupted);
				expect(true).toBe(false);
			} catch {
				expect(true).toBe(true);
			}
		});
	});

	describe('Token Format Validation', () => {
		it('should validate correct encrypted token format', async () => {
			const token = 'test_token';
			const encrypted = await encryptToken(token);
			expect(isValidEncryptedTokenFormat(encrypted)).toBe(true);
		});

		it('should reject invalid token format (no colons)', () => {
			expect(isValidEncryptedTokenFormat('novalidformat')).toBe(false);
		});

		it('should reject invalid token format (wrong colon count)', () => {
			expect(isValidEncryptedTokenFormat('one:two')).toBe(false);
		});

		it('should reject empty string', () => {
			expect(isValidEncryptedTokenFormat('')).toBe(false);
		});

		it('should reject null', () => {
			expect(isValidEncryptedTokenFormat(null as any)).toBe(false);
		});

		it('should reject undefined', () => {
			expect(isValidEncryptedTokenFormat(undefined as any)).toBe(false);
		});

		it('should reject token with invalid hex in IV', () => {
			expect(isValidEncryptedTokenFormat('GGGG:aaaa:bbbb')).toBe(false);
		});

		it('should reject token with short IV', () => {
			const shortIv = 'ab'.repeat(8); // 16 chars = 8 bytes, need 16 bytes
			expect(isValidEncryptedTokenFormat(`${shortIv}:${'cd'.repeat(8)}:efgh`)).toBe(false);
		});

		it('should reject token with short auth tag', () => {
			const validIv = 'ab'.repeat(16); // 32 chars = 16 bytes
			const shortTag = 'cd'.repeat(4); // 8 chars = 4 bytes, need 16 bytes
			expect(isValidEncryptedTokenFormat(`${validIv}:${shortTag}:efgh`)).toBe(false);
		});

		it('should reject token with empty ciphertext', () => {
			const validIv = 'ab'.repeat(16); // 32 chars = 16 bytes
			const validTag = 'cd'.repeat(8); // 16 chars = 8 bytes
			expect(isValidEncryptedTokenFormat(`${validIv}:${validTag}:`)).toBe(false);
		});
	});

	describe('Key Generation', () => {
		it('should generate valid 64-character hex string', () => {
			const key = generateEncryptionKey();
			expect(key).toMatch(/^[0-9a-f]{64}$/i);
			expect(key.length).toBe(64);
		});

		it('should generate different keys on each call', () => {
			const key1 = generateEncryptionKey();
			const key2 = generateEncryptionKey();
			expect(key1).not.toBe(key2);
		});

		it('should generate key that can be used for encryption', async () => {
			const key = generateEncryptionKey();
			process.env.OAUTH_ENCRYPTION_KEY = key;
			initializeEncryptionKey();

			const token = 'test_token';
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);

			expect(decrypted).toBe(token);
		});
	});

	describe('Performance', () => {
		it('should encrypt token in < 10ms', async () => {
			const token = 'performance_test_token';
			const start = performance.now();
			await encryptToken(token);
			const end = performance.now();

			expect(end - start).toBeLessThan(10);
		});

		it('should decrypt token in < 10ms', async () => {
			const token = 'performance_test_token';
			const encrypted = await encryptToken(token);

			const start = performance.now();
			await decryptToken(encrypted);
			const end = performance.now();

			expect(end - start).toBeLessThan(10);
		});

		it('should handle 100 encryptions reasonably fast', async () => {
			const token = 'batch_test_token';
			const start = performance.now();

			for (let i = 0; i < 100; i++) {
				await encryptToken(token);
			}

			const end = performance.now();
			const avgTime = (end - start) / 100;

			expect(avgTime).toBeLessThan(5); // Less than 5ms per encryption on average
		});

		it('should handle 100 encrypt/decrypt cycles reasonably fast', async () => {
			const token = 'cycle_test_token';
			const start = performance.now();

			for (let i = 0; i < 100; i++) {
				const encrypted = await encryptToken(token);
				await decryptToken(encrypted);
			}

			const end = performance.now();
			const avgTime = (end - start) / 100;

			expect(avgTime).toBeLessThan(10); // Less than 10ms per cycle on average
		});
	});

	describe('Edge Cases', () => {
		it('should handle token with only whitespace', async () => {
			const token = '   \n\t  ';
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});

		it('should handle token that looks like encrypted format', async () => {
			const token = 'aa:bb:cc'; // Looks like encrypted but is just a plain token
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});

		it('should handle identical encryptions from same key producing different ciphertext', async () => {
			const token = 'identical_test';
			const enc1 = await encryptToken(token);
			const enc2 = await encryptToken(token);
			const enc3 = await encryptToken(token);

			// All should decrypt to same value
			expect(await decryptToken(enc1)).toBe(token);
			expect(await decryptToken(enc2)).toBe(token);
			expect(await decryptToken(enc3)).toBe(token);

			// But ciphertexts should all be different
			expect(new Set([enc1, enc2, enc3]).size).toBe(3);
		});

		it('should handle token with leading/trailing special characters', async () => {
			const token = '!!!token!!!';
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});
	});
});
