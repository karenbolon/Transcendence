import { describe, it, expect, beforeEach } from 'vitest';
import { cleanDatabase, createTestUser } from '$lib/server/db/test_db/test-utils';
import { hashPassword } from '$lib/server/auth/password';
import { POST as passwordHandler } from '../password/+server';

function mockPostEvent(userId: number | null, body: Record<string, unknown>) {
	return {
		locals: userId ? { user: { id: userId } } : {},
		request: new Request('http://localhost/api/settings/password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		}),
	} as any;
}

describe('POST /api/settings/password', () => {
	const VALID_OLD = 'OldPass123';
	const VALID_NEW = 'NewPass456';

	beforeEach(async () => {
		await cleanDatabase();
	});

	// ════════════════════════════════════════════════════════════════════════
	// Auth
	// ════════════════════════════════════════════════════════════════════════
	it('should return 401 if not authenticated', async () => {
		const res = await passwordHandler(mockPostEvent(null, {
			currentPassword: VALID_OLD,
			newPassword: VALID_NEW,
		}));
		expect(res.status).toBe(401);
	});

	// ════════════════════════════════════════════════════════════════════════
	// Missing fields
	// ════════════════════════════════════════════════════════════════════════
	it('should return 400 if currentPassword is missing', async () => {
		const hash = await hashPassword(VALID_OLD);
		const user = await createTestUser({ password_hash: hash });
		const res = await passwordHandler(mockPostEvent(user.id, { newPassword: VALID_NEW }));
		expect(res.status).toBe(400);
	});

	it('should return 400 if newPassword is missing', async () => {
		const hash = await hashPassword(VALID_OLD);
		const user = await createTestUser({ password_hash: hash });
		const res = await passwordHandler(mockPostEvent(user.id, { currentPassword: VALID_OLD }));
		expect(res.status).toBe(400);
	});

	// ════════════════════════════════════════════════════════════════════════
	// Wrong current password
	// ════════════════════════════════════════════════════════════════════════
	it('should return 400 if current password is wrong', async () => {
		const hash = await hashPassword(VALID_OLD);
		const user = await createTestUser({ password_hash: hash });
		const res = await passwordHandler(mockPostEvent(user.id, {
			currentPassword: 'WrongPass1',
			newPassword: VALID_NEW,
		}));
		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.error).toBe('Current password is incorrect');
	});

	// ════════════════════════════════════════════════════════════════════════
	// New password validation
	// ════════════════════════════════════════════════════════════════════════
	it('should reject weak new password (no uppercase)', async () => {
		const hash = await hashPassword(VALID_OLD);
		const user = await createTestUser({ password_hash: hash });
		const res = await passwordHandler(mockPostEvent(user.id, {
			currentPassword: VALID_OLD,
			newPassword: 'weakpass123',
		}));
		expect(res.status).toBe(400);
	});

	it('should reject short new password', async () => {
		const hash = await hashPassword(VALID_OLD);
		const user = await createTestUser({ password_hash: hash });
		const res = await passwordHandler(mockPostEvent(user.id, {
			currentPassword: VALID_OLD,
			newPassword: 'Ab1',
		}));
		expect(res.status).toBe(400);
	});

	// ════════════════════════════════════════════════════════════════════════
	// Success
	// ════════════════════════════════════════════════════════════════════════
	it('should change password successfully', async () => {
		const hash = await hashPassword(VALID_OLD);
		const user = await createTestUser({ password_hash: hash });
		const res = await passwordHandler(mockPostEvent(user.id, {
			currentPassword: VALID_OLD,
			newPassword: VALID_NEW,
		}));
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.success).toBe(true);
	});

	it('should allow login with new password after change', async () => {
		const hash = await hashPassword(VALID_OLD);
		const user = await createTestUser({ password_hash: hash });

		// Change it
		await passwordHandler(mockPostEvent(user.id, {
			currentPassword: VALID_OLD,
			newPassword: VALID_NEW,
		}));

		// Old password should now fail
		const failRes = await passwordHandler(mockPostEvent(user.id, {
			currentPassword: VALID_OLD,
			newPassword: 'AnotherPass1',
		}));
		expect(failRes.status).toBe(400);

		// New password should work
		const successRes = await passwordHandler(mockPostEvent(user.id, {
			currentPassword: VALID_NEW,
			newPassword: 'FinalPass789',
		}));
		expect(successRes.status).toBe(200);
	});
});
