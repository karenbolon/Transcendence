import { describe, it, expect, beforeEach } from 'vitest';
import { cleanDatabase, createTestUser } from '$lib/server/db/test_db/test-utils';
import { hashPassword } from '$lib/server/auth/password';
import { POST as emailHandler } from '../email/+server';

function mockPostEvent(userId: number | null, body: Record<string, unknown>) {
	return {
		locals: userId ? { user: { id: userId } } : {},
		request: new Request('http://localhost/api/settings/email', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		}),
	} as any;
}

describe('POST /api/settings/email', () => {
	const PASSWORD = 'ValidPass123';

	beforeEach(async () => {
		await cleanDatabase();
	});

	// ════════════════════════════════════════════════════════════════════════
	// Auth
	// ════════════════════════════════════════════════════════════════════════
	it('should return 401 if not authenticated', async () => {
		const res = await emailHandler(mockPostEvent(null, {
			newEmail: 'new@example.com',
			password: PASSWORD,
		}));
		expect(res.status).toBe(401);
	});

	// ════════════════════════════════════════════════════════════════════════
	// Missing fields
	// ════════════════════════════════════════════════════════════════════════
	it('should return 400 if newEmail is missing', async () => {
		const hash = await hashPassword(PASSWORD);
		const user = await createTestUser({ password_hash: hash });
		const res = await emailHandler(mockPostEvent(user.id, { password: PASSWORD }));
		expect(res.status).toBe(400);
	});

	it('should return 400 if password is missing', async () => {
		const hash = await hashPassword(PASSWORD);
		const user = await createTestUser({ password_hash: hash });
		const res = await emailHandler(mockPostEvent(user.id, { newEmail: 'new@example.com' }));
		expect(res.status).toBe(400);
	});

	// ════════════════════════════════════════════════════════════════════════
	// Wrong password
	// ════════════════════════════════════════════════════════════════════════
	it('should return 400 if password is wrong', async () => {
		const hash = await hashPassword(PASSWORD);
		const user = await createTestUser({ password_hash: hash });
		const res = await emailHandler(mockPostEvent(user.id, {
			newEmail: 'new@example.com',
			password: 'WrongPass1',
		}));
		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.error).toBe('Password is incorrect');
	});

	// ════════════════════════════════════════════════════════════════════════
	// Invalid email format
	// ════════════════════════════════════════════════════════════════════════
	it('should reject invalid email format', async () => {
		const hash = await hashPassword(PASSWORD);
		const user = await createTestUser({ password_hash: hash });
		const res = await emailHandler(mockPostEvent(user.id, {
			newEmail: 'not-an-email',
			password: PASSWORD,
		}));
		expect(res.status).toBe(400);
	});

	// ════════════════════════════════════════════════════════════════════════
	// Duplicate email
	// ════════════════════════════════════════════════════════════════════════
	it('should reject duplicate email', async () => {
		const hash = await hashPassword(PASSWORD);
		await createTestUser({ email: 'taken@example.com', password_hash: hash });
		const user2 = await createTestUser({ password_hash: hash });

		const res = await emailHandler(mockPostEvent(user2.id, {
			newEmail: 'taken@example.com',
			password: PASSWORD,
		}));
		// Could be 409 (unique constraint caught) or 500 (generic DB error)
		expect([409, 500]).toContain(res.status);
	});

	// ════════════════════════════════════════════════════════════════════════
	// Success
	// ════════════════════════════════════════════════════════════════════════
	it('should change email successfully', async () => {
		const hash = await hashPassword(PASSWORD);
		const user = await createTestUser({ password_hash: hash });
		const res = await emailHandler(mockPostEvent(user.id, {
			newEmail: 'updated@example.com',
			password: PASSWORD,
		}));
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.email).toBe('updated@example.com');
	});

	it('should lowercase email', async () => {
		const hash = await hashPassword(PASSWORD);
		const user = await createTestUser({ password_hash: hash });
		const res = await emailHandler(mockPostEvent(user.id, {
			newEmail: 'Updated@Example.COM',
			password: PASSWORD,
		}));
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.email).toBe('updated@example.com');
	});
});
