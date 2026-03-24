/**
 * Token Encryption Module
 * 
 * Provides secure encryption/decryption of OAuth tokens using AES-256-GCM.
 * - NIST-approved authenticated encryption algorithm
 * - Random IV per encryption prevents pattern analysis attacks
 * - Ensures data confidentiality and integrity
 */

import crypto from 'crypto';

// Configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const ENCODING = 'hex';

// Encryption key - should be loaded from environment
let encryptionKey: Buffer | null = null;

/**
 * Initialize the encryption key.
 * Must be called before any encrypt/decrypt operations.
 *
 * If no key is provided/found, logs a warning and OAuth token encryption
 * will be unavailable (encrypt/decrypt calls will throw at runtime).
 *
 * @param key - The 64-char hex key. If omitted, falls back to process.env.OAUTH_ENCRYPTION_KEY.
 * @throws {Error} if the key is provided but has an invalid format
 */
export function initializeEncryptionKey(key?: string): void {
	const keyEnv = key ?? process.env.OAUTH_ENCRYPTION_KEY;

	if (!keyEnv) {
		console.warn('OAUTH_ENCRYPTION_KEY is not set — OAuth token encryption is disabled. Set this variable to enable third-party OAuth.');
		return;
	}

	if (keyEnv.length !== KEY_LENGTH * 2) {
		throw new Error(`OAUTH_ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`);
	}

	try {
		encryptionKey = Buffer.from(keyEnv, ENCODING);
		if (encryptionKey.length !== KEY_LENGTH) {
			throw new Error('Invalid key length after conversion');
		}
	} catch (error) {
		throw new Error(`OAUTH_ENCRYPTION_KEY is not valid hex: ${error instanceof Error ? error.message : ''}`);
	}
}

/**
 * Generates a random encryption key suitable for storing in environment
 * @returns {string} 64-character hex string (256-bit key)
 */
export function generateEncryptionKey(): string {
	return crypto.randomBytes(KEY_LENGTH).toString(ENCODING);
}

/**
 * Encrypts a token string using AES-256-GCM
 * 
 * @param token - The token string to encrypt
 * @returns {Promise<string>} Encrypted token in format: iv:authTag:encryptedData (all hex-encoded)
 * @throws {Error} if encryption key is not initialized or token is empty
 */
export async function encryptToken(token: string): Promise<string> {
	if (!encryptionKey) {
		throw new Error('Encryption key not initialized. Call initializeEncryptionKey() first.');
	}
	
	if (!token || typeof token !== 'string') {
		throw new Error('Token must be a non-empty string');
	}
	
	// Generate random IV for this encryption
	const iv = crypto.randomBytes(IV_LENGTH);
	
	// Create cipher
	const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
	
	// Encrypt the token
	let encrypted = cipher.update(token, 'utf8', ENCODING);
	encrypted += cipher.final(ENCODING);
	
	// Get authentication tag
	const authTag = cipher.getAuthTag();
	
	// Return as: iv:authTag:encryptedData
	return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`;
}

/**
 * Decrypts a token encrypted by encryptToken()
 * 
 * @param encryptedToken - The encrypted token string in format: iv:authTag:encryptedData
 * @returns {Promise<string>} The decrypted token
 * @throws {Error} if decryption key is not initialized, token format is invalid, or decryption fails
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
	if (!encryptionKey) {
		throw new Error('Encryption key not initialized. Call initializeEncryptionKey() first.');
	}
	
	if (!encryptedToken || typeof encryptedToken !== 'string') {
		throw new Error('Encrypted token must be a non-empty string');
	}
	
	// Parse the encrypted token
	const parts = encryptedToken.split(':');
	if (parts.length !== 3) {
		throw new Error('Invalid encrypted token format. Expected: iv:authTag:encryptedData');
	}
	
	const [ivHex, authTagHex, encryptedData] = parts;
	
	try {
		// Convert hex strings back to buffers
		const iv = Buffer.from(ivHex, ENCODING);
		const authTag = Buffer.from(authTagHex, ENCODING);
		
		// Validate buffer lengths
		if (iv.length !== IV_LENGTH) {
			throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
		}
		if (authTag.length !== TAG_LENGTH) {
			throw new Error(`Invalid auth tag length: expected ${TAG_LENGTH}, got ${authTag.length}`);
		}
		
		// Create decipher
		const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
		decipher.setAuthTag(authTag);
		
		// Decrypt the token
		let decrypted = decipher.update(encryptedData, ENCODING, 'utf8');
		decrypted += decipher.final('utf8');
		
		return decrypted;
	} catch (error) {
		if (error instanceof Error && error.message.includes('Unsupported state or unable to authenticate data')) {
			throw new Error('Token integrity check failed. The token may have been tampered with.');
		}
		throw error;
	}
}

/**
 * Validates an encrypted token without decrypting it
 * Useful for checking if a token is in valid format before processing
 * 
 * @param encryptedToken - The encrypted token string
 * @returns {boolean} true if token format is valid
 */
export function isValidEncryptedTokenFormat(encryptedToken: string): boolean {
	if (!encryptedToken || typeof encryptedToken !== 'string') {
		return false;
	}
	
	const parts = encryptedToken.split(':');
	if (parts.length !== 3) {
		return false;
	}
	
	const [ivHex, authTagHex, encryptedData] = parts;
	
	try {
		// Check if all parts are valid hex
		const iv = Buffer.from(ivHex, ENCODING);
		const authTag = Buffer.from(authTagHex, ENCODING);
		
		return iv.length === IV_LENGTH && authTag.length === TAG_LENGTH && encryptedData.length > 0;
	} catch {
		return false;
	}
}
