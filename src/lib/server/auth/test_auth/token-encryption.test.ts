// src/lib/server/auth/test_auth/token-encryption.test.ts
import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken, isTokenEncryptionConfigured } from '../token-encryption';

describe('Token Encryption', () => {
	it('should be properly configured', () => {
		expect(isTokenEncryptionConfigured()).toBe(true);
	});

	it('should encrypt and decrypt a token', async () => {
		const originalToken = 'gho_test1234567890abcdefghijklmnopqrstuvwxyz';
		
		const encrypted = await encryptToken(originalToken);
		expect(encrypted).not.toBe(originalToken);
		expect(encrypted.length).toBeGreaterThan(originalToken.length);
		
		const decrypted = await decryptToken(encrypted);
		expect(decrypted).toBe(originalToken);
	});

	it('should produce different ciphertext each time (IV randomization)', async () => {
		const token = 'test_token_12345';
		
		const encrypted1 = await encryptToken(token);
		const encrypted2 = await encryptToken(token);
		
		// Different encrypted values due to random IV
		expect(encrypted1).not.toBe(encrypted2);
		
		// But both decrypt to same value
		expect(await decryptToken(encrypted1)).toBe(token);
		expect(await decryptToken(encrypted2)).toBe(token);
	});

	it('should handle long tokens', async () => {
		const longToken = 'a'.repeat(1000);
		const encrypted = await encryptToken(longToken);
		const decrypted = await decryptToken(encrypted);
		expect(decrypted).toBe(longToken);
	});

	it('should handle special characters', async () => {
		const specialToken = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\' \n\t';
		const encrypted = await encryptToken(specialToken);
		const decrypted = await decryptToken(encrypted);
		expect(decrypted).toBe(specialToken);
	});

	it('should throw error for empty token', async () => {
		await expect(encryptToken('')).rejects.toThrow('Token cannot be empty');
	});

	it('should throw error for corrupted encrypted token', async () => {
		const token = 'valid_token';
		const encrypted = await encryptToken(token);
		
		// Corrupt the encrypted token
		const corrupted = encrypted.slice(0, -5) + 'XXXXX';
		
		await expect(decryptToken(corrupted)).rejects.toThrow('Failed to decrypt token');
	});

	it('should throw error for invalid base64', async () => {
		await expect(decryptToken('not_valid_base64!!!')).rejects.toThrow();
	});
});
