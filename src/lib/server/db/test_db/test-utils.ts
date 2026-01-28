// src/lib/server/db/test_db/test-utils.ts
// ══════════════════════════════════════════════════════════════════════════════
// 🧪 Test Utilities
// ══════════════════════════════════════════════════════════════════════════════
// Shared helper functions for all test files.
// ══════════════════════════════════════════════════════════════════════════════

import { db } from '../index';
import { users, games, friendships, sessions } from '../schema';
import type { User } from '../schema';

// ══════════════════════════════════════════════════════════════════════════════
// 🧹 DATABASE CLEANUP
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Clean all tables in the correct order (respecting foreign keys)
 * Call this in beforeEach() to ensure each test starts fresh
 */
export async function cleanDatabase() {
	// Delete in reverse dependency order!
	// 1. Sessions depend on Users
	// 2. Friendships depend on Users
	// 3. Games depend on Users
	// 4. Users have no dependencies
	await db.delete(sessions).execute().catch(() => {});
	await db.delete(friendships).execute().catch(() => {});
	await db.delete(games).execute().catch(() => {});
	await db.delete(users).execute().catch(() => {});
}

// ══════════════════════════════════════════════════════════════════════════════
// 👤 USER HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create test users with unique, predictable data
 * @param count Number of users to create (default: 2)
 * @returns Array of created users
 */
export async function createTestUsers(count: number = 2): Promise<User[]> {
	const timestamp = Date.now();
	const createdUsers: User[] = [];

	for (let i = 1; i <= count; i++) {
		const [user] = await db
			.insert(users)
			.values({
				username: `testuser_${timestamp}_${i}`,
				name: `Test User ${i}`,
				email: `test_${timestamp}_${i}@test.com`,
				password_hash: `hash_${timestamp}_${i}`,
				avatar_url: null,
				is_online: false
			})
			.returning();

		createdUsers.push(user);
	}

	return createdUsers;
}

/**
 * Create a single test user with custom data
 */
export async function createTestUser(
	overrides: Partial<{
		username: string;
		name: string;
		email: string;
		password_hash: string;
		avatar_url: string | null;
		bio: string | null;
		is_online: boolean;
	}> = {}
): Promise<User> {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(7);

	const [user] = await db
		.insert(users)
		.values({
			username: overrides.username ?? `user_${timestamp}_${random}`,
			name: overrides.name ?? 'Test User',
			email: overrides.email ?? `test_${timestamp}_${random}@test.com`,
			password_hash: overrides.password_hash ?? `hash_${random}`,
			avatar_url: overrides.avatar_url ?? null,
			bio: overrides.bio ?? null,
			is_online: overrides.is_online ?? false
		})
		.returning();

	return user;
}

// ══════════════════════════════════════════════════════════════════════════════
// 🎮 GAME HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a test game between two users
 * Note: status must be 'waiting', 'active', or 'finished'
 */
export async function createTestGame(
	player1Id: number,
	player2Id: number | null = null,
	options: Partial<{
		type: string;
		player1_score: number;
		player2_score: number;
		status: 'waiting' | 'active' | 'finished';
		winner_id: number | null;
	}> = {}
) {
	const [game] = await db
		.insert(games)
		.values({
			type: options.type ?? 'pong',
			player1_id: player1Id,
			player2_id: player2Id,
			player1_score: options.player1_score ?? 0,
			player2_score: options.player2_score ?? 0,
			status: options.status ?? 'waiting',
			winner_id: options.winner_id ?? null
		})
		.returning();

	return game;
}

// ══════════════════════════════════════════════════════════════════════════════
// 🤝 FRIENDSHIP HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a friendship between two users
 * Note: status must be 'pending', 'accepted', or 'rejected'
 */
export async function createTestFriendship(
	userId: number,
	friendId: number,
	status: 'pending' | 'accepted' | 'rejected' = 'pending'
) {
	const [friendship] = await db
		.insert(friendships)
		.values({
			user_id: userId,
			friend_id: friendId,
			status
		})
		.returning();

	return friendship;
}

// ══════════════════════════════════════════════════════════════════════════════
// 📊 DEBUG HELPERS (optional - use when debugging test failures)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Print current database state (useful for debugging)
 */
export async function debugDatabaseState() {
	const allUsers = await db.select().from(users);
	const allGames = await db.select().from(games);
	const allFriendships = await db.select().from(friendships);

	console.log('\n📊 Current Database State:');
	console.log(`   Users: ${allUsers.length}`);
	console.log(`   Games: ${allGames.length}`);
	console.log(`   Friendships: ${allFriendships.length}`);

	if (allUsers.length > 0) {
		console.log('\n   Users:');
		allUsers.forEach((u) => console.log(`     - ${u.id}: ${u.username}`));
	}

	return { users: allUsers, games: allGames, friendships: allFriendships };
}