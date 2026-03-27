/**
 * 🧪 Token Encryption Test Suite
 * 
 * Comprehensive tests for OAuth token encryption/decryption
 * - Configuration validation
 * - Encrypt/decrypt roundtrips
 * - Security properties (IV randomization, etc)
 * - Error handling
 * - Edge cases
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
	encryptToken,
	decryptToken,
	isTokenEncryptionConfigured,
	isTokenValid
} from '../token-encryption';

describe('Token Encryption', () => {
	beforeAll(() => {
		// Ensure encryption key is set
		if (!process.env.OAUTH_ENCRYPTION_KEY) {
			process.env.OAUTH_ENCRYPTION_KEY = '69ef54fed05fff5ff9ed82f4802c459d442f821849375b2691c13ee01ace67d0';
		}
	});

	describe('Configuration', () => {
		it('should be properly configured', () => {
			expect(isTokenEncryptionConfigured()).toBe(true);
		});
	});

	describe('Basic Encryption/Decryption', () => {
		it('should encrypt and decrypt a token', async () => {
			const original = 'gho_test1234567890';
			const encrypted = await encryptToken(original);
			const decrypted = await decryptToken(encrypted);
			
			expect(decrypted).toBe(original);
			expect(encrypted).not.toBe(original);
		});

		it('should produce different ciphertext each time (IV randomization)', async () => {
			const token = 'gho_same_token_123';
			const encrypted1 = await encryptToken(token);
			const encrypted2 = await encryptToken(token);
			
			// Different ciphertexts for same plaintext
			expect(encrypted1).not.toBe(encrypted2);
			
			// But both decrypt to same value
			const decrypted1 = await decryptToken(encrypted1);
			const decrypted2 = await decryptToken(encrypted2);
			expect(decrypted1).toBe(token);
			expect(decrypted2).toBe(token);
		});
	});

	describe('Token Length Handling', () => {
		it('should handle short tokens', async () => {
			const token = 'a';
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});

		it('should handle long tokens (1000+ characters)', async () => {
			const token = 'x'.repeat(1000);
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});

		it('should handle GitHub token format', async () => {
			const githubToken = 'gho_' + 'a'.repeat(36);
			const encrypted = await encryptToken(githubToken);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(githubToken);
		});

		it('should handle 42 Intra token format', async () => {
			const intraToken = 'somerandomtoken_' + Math.random().toString(36).substring(2, 50);
			const encrypted = await encryptToken(intraToken);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(intraToken);
		});
	});

	describe('Special Characters & Encoding', () => {
		it('should handle special characters', async () => {
			const token = 'token!@#$%^&*()_+-=[]{}|;:,.<>?';
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});

		it('should handle unicode characters', async () => {
			const token = 'token_🔐_🔑_✅_🚀';
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});

		it('should handle whitespace and newlines', async () => {
			const token = 'token\nwith\nnewlines\t\tand\ttabs   spaces';
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});

		it('should handle binary-like strings', async () => {
			const token = '\x00\x01\x02\x03\x04\x05';
			const encrypted = await encryptToken(token);
			const decrypted = await decryptToken(encrypted);
			expect(decrypted).toBe(token);
		});
	});

	describe('Error Handling', () => {
		it('should throw error for empty token', async () => {
			await expect(encryptToken('')).rejects.toThrow('Token cannot be empty');
		});

		it('should throw error for whitespace-only token', async () => {
			await expect(encryptToken('   ')).rejects.toThrow('Token cannot be empty');
		});

		it('should throw error for empty encrypted token', async () => {
			await expect(decryptToken('')).rejects.toThrow('Encrypted token cannot be empty');
		});

		it('should throw error for corrupted encrypted token', async () => {
			const corrupted = 'aW52YWxpZCBiYXNlNjQgc3RyaW5n'; // "invalid base64 string" in base64
			await expect(decryptToken(corrupted)).rejects.toThrow();
		});

		it('should throw error for tampered token', async () => {
			const token = 'original_token_123';
			let encrypted = await encryptToken(token);
			
			// Tamper with the encrypted token
			const buffer = Buffer.from(encrypted, 'base64');
			buffer[buffer.length - 1] ^= 0xFF; // Flip last byte
			const tampered = buffer.toString('base64');
			
			// Decryption should fail
			await expect(decryptToken(tampered)).rejects.toThrow();
		});

		it('should throw error for truncated token', async () => {
			const token = 'test_token';
			const encrypted = await encryptToken(token);
			
			// Remove last 10 characters
			const truncated = encrypted.slice(0, -10);
			
			await expect(decryptToken(truncated)).rejects.toThrow();
		});
	});

	describe('Token Validation', () => {
		it('should validate a valid token', async () => {
			const token = 'valid_token_123';
			const encrypted = await encryptToken(token);
			const isValid = await isTokenValid(encrypted);
			expect(isValid).toBe(true);
		});

		it('should invalidate a corrupted token', async () => {
			const isValid = await isTokenValid('invalid_base64!!!');
			expect(isValid).toBe(false);
		});

		it('should invalidate an empty string', async () => {
			const isValid = await isTokenValid('');
			expect(isValid).toBe(false);
		});
	});

	describe('Performance', () => {
		it('should encrypt reasonably fast', async () => {
			const token = 'token_' + Math.random().toString(36);
			const start = performance.now();
			await encryptToken(token);
			const duration = performance.now() - start;
			
			// Should complete in under 50ms (generous timeout)
			expect(duration).toBeLessThan(50);
		});

		it('should decrypt reasonably fast', async () => {
			const token = 'token_' + Math.random().toString(36);
			const encrypted = await encryptToken(token);
			
			const start = performance.now();
			await decryptToken(encrypted);
			const duration = performance.now() - start;
			
			// Should complete in under 50ms
			expect(duration).toBeLessThan(50);
		});
	});

	describe('Roundtrip Consistency', () => {
		const testTokens = [
			'simple_token',
			'gho_' + 'a'.repeat(40),
			'token!@#$%^&*()',
			'token_' + Math.random().toString(36).substring(2, 15),
			'x'.repeat(500)
		];

		testTokens.forEach(token => {
			it(`should roundtrip token: ${token.substring(0, 20)}...`, async () => {
				const encrypted = await encryptToken(token);
				const decrypted = await decryptToken(encrypted);
				expect(decrypted).toBe(token);
			});
		});
	});
});
