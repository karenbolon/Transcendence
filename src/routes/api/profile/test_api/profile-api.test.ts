import { describe, it, expect, beforeEach } from 'vitest';
import { cleanDatabase, createTestUser } from '$lib/server/db/test_db/test-utils';
import { PUT as profileHandler } from '../+server';

// ══════════════════════════════════════════════════════════════════════════════
// Helper: build mock SvelteKit event
// ══════════════════════════════════════════════════════════════════════════════

function mockPutEvent(userId: number | null, body: Record<string, unknown>) {
	return {
		locals: userId ? { user: { id: userId } } : {},
		request: new Request('http://localhost/api/profile', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		}),
	} as any;
}

function mockPutEventRaw(userId: number | null, rawBody: string) {
	return {
		locals: userId ? { user: { id: userId } } : {},
		request: new Request('http://localhost/api/profile', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: rawBody,
		}),
	} as any;
}

describe('PUT /api/profile', () => {
	beforeEach(async () => {
		await cleanDatabase();
	});

	// ════════════════════════════════════════════════════════════════════════
	// Auth
	// ════════════════════════════════════════════════════════════════════════
	it('should return 401 if not authenticated', async () => {
		const res = await profileHandler(mockPutEvent(null, { name: 'Test' }));
		expect(res.status).toBe(401);
	});

	// ════════════════════════════════════════════════════════════════════════
	// Name validation
	// ════════════════════════════════════════════════════════════════════════
	it('should update name successfully', async () => {
		const user = await createTestUser();
		const res = await profileHandler(mockPutEvent(user.id, { name: 'New Name' }));
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.user.name).toBe('New Name');
	});

	it('should reject empty name', async () => {
		const user = await createTestUser();
		const res = await profileHandler(mockPutEvent(user.id, { name: '' }));
		expect(res.status).toBe(400);
	});

	it('should reject name over 100 chars', async () => {
		const user = await createTestUser();
		const longName = 'a'.repeat(101);
		const res = await profileHandler(mockPutEvent(user.id, { name: longName }));
		expect(res.status).toBe(400);
	});

	it('should trim name whitespace', async () => {
		const user = await createTestUser();
		const res = await profileHandler(mockPutEvent(user.id, { name: '  Trimmed  ' }));
		const data = await res.json();

		expect(data.user.name).toBe('Trimmed');
	});

	// ════════════════════════════════════════════════════════════════════════
	// Bio validation
	// ════════════════════════════════════════════════════════════════════════
	it('should update bio successfully', async () => {
		const user = await createTestUser();
		const res = await profileHandler(mockPutEvent(user.id, { bio: 'Hello world' }));
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.user.bio).toBe('Hello world');
	});

	it('should reject bio over 300 chars', async () => {
		const user = await createTestUser();
		const longBio = 'a'.repeat(301);
		const res = await profileHandler(mockPutEvent(user.id, { bio: longBio }));
		expect(res.status).toBe(400);
	});

	it('should allow empty bio (clears it)', async () => {
		const user = await createTestUser();
		const res = await profileHandler(mockPutEvent(user.id, { bio: '' }));
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.user.bio).toBeNull();
	});

	// ════════════════════════════════════════════════════════════════════════
	// Avatar URL
	// ════════════════════════════════════════════════════════════════════════
	it('should update avatar URL', async () => {
		const user = await createTestUser();
		const res = await profileHandler(mockPutEvent(user.id, { avatarUrl: '/avatars/defaults/wizard.svg' }));
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.user.avatarUrl).toBe('/avatars/defaults/wizard.svg');
	});

	it('should clear avatar with null', async () => {
		const user = await createTestUser({ avatar_url: '/avatars/old.svg' });
		const res = await profileHandler(mockPutEvent(user.id, { avatarUrl: null }));
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.user.avatarUrl).toBeNull();
	});

	// ════════════════════════════════════════════════════════════════════════
	// Multiple fields at once
	// ════════════════════════════════════════════════════════════════════════
	it('should update multiple fields at once', async () => {
		const user = await createTestUser();
		const res = await profileHandler(mockPutEvent(user.id, {
			name: 'Full Update',
			bio: 'New bio text',
			avatarUrl: '/avatars/defaults/robot.svg',
		}));
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.user.name).toBe('Full Update');
		expect(data.user.bio).toBe('New bio text');
		expect(data.user.avatarUrl).toBe('/avatars/defaults/robot.svg');
	});

	// ════════════════════════════════════════════════════════════════════════
	// Invalid JSON
	// ════════════════════════════════════════════════════════════════════════
	it('should return 400 for invalid JSON', async () => {
		const user = await createTestUser();
		const res = await profileHandler(mockPutEventRaw(user.id, 'not json'));
		expect(res.status).toBe(400);
	});
});
