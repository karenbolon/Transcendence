// src/lib/server/auth/password.ts
import { hash, verify } from '@node-rs/argon2';

/**
 * Hash a password using Argon2id
 * @param password - Plain text password to hash
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
	return await hash(password, {
		// Recommended minimum parameters for Argon2id
		memoryCost: 65536,   // 64 MB (was ~19 MB)
		timeCost: 3,         // 3 iterations (was 2)
		outputLen: 32,       // 32 bytes
		parallelism: 1       // 1 thread
	});
}

/**
 * Verify a password against its hash
 * @param hash - The stored password hash
 * @param password - Plain text password to verify
 * @returns true if password matches, false otherwise
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
	try {
		return await verify(hash, password, {
			memoryCost: 65536,  // MUST match hashPassword settings
			timeCost: 3,        // MUST match hashPassword settings
			outputLen: 32,
			parallelism: 1
		});
	} catch (error) {
		// If verification fails (invalid hash format, etc.)
		return false;
	}
}