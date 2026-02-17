// src/lib/server/auth/token-encryption.ts
import { env } from '$env/dynamic/private';
import { webcrypto } from 'node:crypto';

/**
 * OAuth Token Encryption/Decryption
 * 
 * Uses AES-256-GCM encryption (Web Crypto API) to protect OAuth tokens in the database.
 * The encryption key must be a 32-byte (64 hex character) secret stored in .env
 * 
 * Security Notes:
 * - Keep OAUTH_ENCRYPTION_KEY secret and never commit to git
 * - Rotate keys periodically in production
 * - If key is compromised, all stored tokens must be re-encrypted
 * - Key loss means all stored tokens become unrecoverable
 */

/**
 * Get the encryption key from environment variables
 * @throws Error if key is not set or invalid
 */
function getEncryptionKey(): Uint8Array {
	const keyHex = env.OAUTH_ENCRYPTION_KEY;
	
	if (!keyHex) {
		throw new Error(
			'OAUTH_ENCRYPTION_KEY not set in environment. ' +
			'Generate with: openssl rand -hex 32'
		);
	}
	
	if (keyHex.length !== 64) {
		throw new Error(
			'OAUTH_ENCRYPTION_KEY must be 64 hex characters (32 bytes). ' +
			'Current length: ' + keyHex.length
		);
	}
	
	// Convert hex string to Uint8Array
	const bytes = new Uint8Array(32);
	for (let i = 0; i < 32; i++) {
		bytes[i] = parseInt(keyHex.substr(i * 2, 2), 16);
	}
	
	return bytes;
}

/**
 * Encrypt an OAuth token for storage in the database
 * @param token - Plain text token to encrypt
 * @returns Encrypted token as base64 string
 * @throws Error if encryption fails
 */
export async function encryptToken(token: string): Promise<string> {
	if (!token) {
		throw new Error('Token cannot be empty');
	}
	
	try {
		const keyBytes = getEncryptionKey();
		
		// Import key for AES-GCM
		const cryptoKey = await webcrypto.subtle.importKey(
			'raw',
			keyBytes,
			{ name: 'AES-GCM', length: 256 },
			false,
			['encrypt']
		);
		
		// Generate random IV (12 bytes for GCM)
		const iv = webcrypto.getRandomValues(new Uint8Array(12));
		
		// Encrypt the token
		const encoder = new TextEncoder();
		const data = encoder.encode(token);
		
		const ciphertext = await webcrypto.subtle.encrypt(
			{ name: 'AES-GCM', iv },
			cryptoKey,
			data
		);
		
		// Combine IV and ciphertext
		const combined = new Uint8Array(iv.length + ciphertext.byteLength);
		combined.set(iv, 0);
		combined.set(new Uint8Array(ciphertext), iv.length);
		
		// Return as base64
		return Buffer.from(combined).toString('base64');
	} catch (error) {
		console.error('Token encryption failed:', error);
		throw new Error('Failed to encrypt token');
	}
}

/**
 * Decrypt an OAuth token retrieved from the database
 * @param encryptedToken - Encrypted token from database (base64 format)
 * @returns Decrypted plain text token
 * @throws Error if decryption fails
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
	if (!encryptedToken) {
		throw new Error('Encrypted token cannot be empty');
	}
	
	try {
		const keyBytes = getEncryptionKey();
		
		// Import key for AES-GCM
		const cryptoKey = await webcrypto.subtle.importKey(
			'raw',
			keyBytes,
			{ name: 'AES-GCM', length: 256 },
			false,
			['decrypt']
		);
		
		// Decode base64
		const combined = Buffer.from(encryptedToken, 'base64');
		
		// Extract IV (first 12 bytes) and ciphertext
		const iv = combined.slice(0, 12);
		const ciphertext = combined.slice(12);
		
		// Decrypt
		const decrypted = await webcrypto.subtle.decrypt(
			{ name: 'AES-GCM', iv },
			cryptoKey,
			ciphertext
		);
		
		// Convert back to string
		const decoder = new TextDecoder();
		return decoder.decode(decrypted);
	} catch (error) {
		console.error('Token decryption failed:', error);
		throw new Error('Failed to decrypt token - token may be corrupted or key changed');
	}
}

/**
 * Check if token encryption is properly configured
 * @returns true if encryption key is set and valid
 */
export function isTokenEncryptionConfigured(): boolean {
	try {
		getEncryptionKey();
		return true;
	} catch {
		return false;
	}
}
