import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 16;
const AUTH_TAG_LENGTH_BYTES = 16;

let cachedKeyHex: string | null = null;
let cachedKeyBuffer: Buffer | null = null;

function validateKeyHex(key: string): void {
	if (key.length !== KEY_LENGTH_BYTES * 2) {
		throw new Error('OAUTH_ENCRYPTION_KEY must be 64 hex characters');
	}
	if (!/^[0-9a-f]+$/i.test(key)) {
		throw new Error('OAUTH_ENCRYPTION_KEY is not valid hex');
	}
}

function getKeyBuffer(): Buffer {
	const key = process.env.OAUTH_ENCRYPTION_KEY;
	if (!key) {
		throw new Error('OAUTH_ENCRYPTION_KEY environment variable is not set');
	}

	if (cachedKeyBuffer && cachedKeyHex === key) {
		return cachedKeyBuffer;
	}

	validateKeyHex(key);
	cachedKeyHex = key;
	cachedKeyBuffer = Buffer.from(key, 'hex');
	return cachedKeyBuffer;
}

export function initializeEncryptionKey(): void {
	const key = process.env.OAUTH_ENCRYPTION_KEY;
	cachedKeyHex = null;
	cachedKeyBuffer = null;

	if (!key) {
		console.warn('OAUTH_ENCRYPTION_KEY is not set. OAuth token encryption will be unavailable.');
		return;
	}

	validateKeyHex(key);
	cachedKeyHex = key;
	cachedKeyBuffer = Buffer.from(key, 'hex');
}

export function generateEncryptionKey(): string {
	return randomBytes(KEY_LENGTH_BYTES).toString('hex');
}

export function isTokenEncryptionConfigured(): boolean {
	const key = process.env.OAUTH_ENCRYPTION_KEY;
	if (!key) return false;

	try {
		validateKeyHex(key);
		return true;
	} catch {
		return false;
	}
}

export function isValidEncryptedTokenFormat(encryptedToken: unknown): boolean {
	if (typeof encryptedToken !== 'string' || encryptedToken.length === 0) {
		return false;
	}

	const parts = encryptedToken.split(':');
	if (parts.length !== 3) {
		return false;
	}

	const [ivHex, authTagHex, ciphertextHex] = parts;
	if (!/^[0-9a-f]+$/i.test(ivHex) || !/^[0-9a-f]+$/i.test(authTagHex) || !/^[0-9a-f]+$/i.test(ciphertextHex)) {
		return false;
	}
	if (ivHex.length !== IV_LENGTH_BYTES * 2) {
		return false;
	}
	if (authTagHex.length !== AUTH_TAG_LENGTH_BYTES * 2) {
		return false;
	}
	if (ciphertextHex.length === 0 || ciphertextHex.length % 2 !== 0) {
		return false;
	}

	return true;
}

export async function encryptToken(token: string): Promise<string> {
	if (typeof token !== 'string' || token.trim().length === 0) {
		throw new Error('Token cannot be empty');
	}

	try {
		const iv = randomBytes(IV_LENGTH_BYTES);
		const cipher = createCipheriv(ALGORITHM, getKeyBuffer(), iv);
		const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
		const authTag = cipher.getAuthTag();

		return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Token encryption failed: ${error.message}`);
		}
		throw error;
	}
}

export async function decryptToken(encryptedToken: string): Promise<string> {
	if (typeof encryptedToken !== 'string' || encryptedToken.length === 0) {
		throw new Error('Encrypted token cannot be empty');
	}
	if (!isValidEncryptedTokenFormat(encryptedToken)) {
		throw new Error('Invalid encrypted token format');
	}

	try {
		const [ivHex, authTagHex, ciphertextHex] = encryptedToken.split(':');
		const decipher = createDecipheriv(ALGORITHM, getKeyBuffer(), Buffer.from(ivHex, 'hex'));
		decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

		const plaintext = Buffer.concat([
			decipher.update(Buffer.from(ciphertextHex, 'hex')),
			decipher.final()
		]);

		return plaintext.toString('utf8');
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes('Unsupported state or unable to authenticate data')) {
				throw new Error('Token decryption failed: integrity check failed');
			}
			throw new Error(`Token decryption failed: ${error.message}`);
		}
		throw error;
	}
}

export async function isTokenValid(encryptedToken: string): Promise<boolean> {
	try {
		await decryptToken(encryptedToken);
		return true;
	} catch {
		return false;
	}
}
