/**
 * 🔐 OAuth Token Encryption Module
 * 
 * Encrypts/decrypts OAuth access and refresh tokens using AES-256-GCM
 * - Provides authenticated encryption (confidentiality + integrity)
 * - Random IV per encryption (prevents pattern analysis)
 * - NIST-approved algorithm (industry standard)
 * 
 * @module token-encryption
 */

import { webcrypto } from 'node:crypto';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12; // bytes (96 bits recommended for GCM)
const TAG_LENGTH = 128; // bits

/**
 * Validates that encryption is properly configured
 * @returns {boolean} True if OAUTH_ENCRYPTION_KEY is set and valid
 */
export function isTokenEncryptionConfigured(): boolean {
	const key = process.env.OAUTH_ENCRYPTION_KEY;
	if (!key) return false;
	
	// Key should be 64 hex characters (32 bytes)
	return /^[a-f0-9]{64}$/.test(key.toLowerCase());
}

/**
 * Gets the encryption key from environment
 * @throws {Error} If key is not configured
 */
async function getEncryptionKey(): Promise<CryptoKey> {
	const keyString = process.env.OAUTH_ENCRYPTION_KEY;
	
	if (!keyString) {
		throw new Error(
			'OAUTH_ENCRYPTION_KEY environment variable is not set. ' +
			'Generate one with: openssl rand -hex 32'
		);
	}
	
	if (!/^[a-f0-9]{64}$/.test(keyString.toLowerCase())) {
		throw new Error(
			'OAUTH_ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes). ' +
			`Received: ${keyString.length} characters`
		);
	}
	
	// Convert hex string to buffer
	const buffer = Buffer.from(keyString, 'hex');
	
	// Import as a crypto key
	const key = await webcrypto.subtle.importKey(
		'raw',
		buffer,
		{ name: ALGORITHM },
		false, // not extractable
		['encrypt', 'decrypt']
	);
	
	return key as CryptoKey;
}

/**
 * Encrypts an OAuth token
 * 
 * @param {string} token - Plain text OAuth token
 * @returns {Promise<string>} Base64-encoded encrypted token
 * @throws {Error} If token is empty or encryption fails
 * 
 * @example
 * ```typescript
 * const plainToken = 'gho_abc123...';
 * const encrypted = await encryptToken(plainToken);
 * // Store encrypted in database
 * ```
 */
export async function encryptToken(token: string): Promise<string> {
	if (!token || token.trim() === '') {
		throw new Error('Token cannot be empty');
	}
	
	try {
		// Get encryption key
		const key = await getEncryptionKey();
		
		// Generate random IV
		const iv = webcrypto.getRandomValues(new Uint8Array(IV_LENGTH));
		
		// Convert token string to buffer
		const tokenBuffer = new TextEncoder().encode(token);
		
		// Encrypt the token
		const encryptedBuffer = await webcrypto.subtle.encrypt(
			{
				name: ALGORITHM,
				iv,
				tagLength: TAG_LENGTH
			},
			key,
			tokenBuffer
		);
		
		// Combine IV + encrypted data
		const combined = Buffer.concat([
			Buffer.from(iv),
			Buffer.from(encryptedBuffer)
		]);
		
		// Return as base64 for database storage
		return combined.toString('base64');
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Token encryption failed: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Decrypts an OAuth token
 * 
 * @param {string} encryptedToken - Base64-encoded encrypted token from database
 * @returns {Promise<string>} Original plain text token
 * @throws {Error} If token is corrupted or decryption fails
 * 
 * @example
 * ```typescript
 * const encrypted = account.access_token; // from database
 * const plain = await decryptToken(encrypted);
 * // Use plain token for API calls
 * ```
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
	if (!encryptedToken || encryptedToken.trim() === '') {
		throw new Error('Encrypted token cannot be empty');
	}
	
	try {
		// Get encryption key
		const key = await getEncryptionKey();
		
		// Decode from base64
		const combined = Buffer.from(encryptedToken, 'base64');
		
		// Extract IV (first 12 bytes) and encrypted data (rest)
		const iv = combined.slice(0, IV_LENGTH);
		const encryptedData = combined.slice(IV_LENGTH);
		
		if (iv.length !== IV_LENGTH) {
			throw new Error('Invalid encrypted token: IV length mismatch');
		}
		
		// Decrypt the token
		const decryptedBuffer = await webcrypto.subtle.decrypt(
			{
				name: ALGORITHM,
				iv,
				tagLength: TAG_LENGTH
			},
			key,
			encryptedData
		);
		
		// Convert buffer back to string
		return new TextDecoder().decode(decryptedBuffer);
	} catch (error) {
		if (error instanceof Error) {
			// Distinguish between corruption and other errors
			if (error.message.includes('Unsupported state or unable to authenticate data')) {
				throw new Error(
					'Token decryption failed: Token is corrupted, tampered with, or encryption key has changed'
				);
			}
			throw new Error(`Token decryption failed: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Verifies a token can be decrypted without actually retrieving it
 * Useful for checking token validity/corruption
 * 
 * @param {string} encryptedToken - Base64-encoded encrypted token
 * @returns {Promise<boolean>} True if token can be decrypted
 */
export async function isTokenValid(encryptedToken: string): Promise<boolean> {
	try {
		await decryptToken(encryptedToken);
		return true;
	} catch {
		return false;
	}
}

