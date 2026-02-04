// src/lib/server/db/test_db/test-utils.ts
// ══════════════════════════════════════════════════════════════════════════════
// 🧪 Test Utilities
// ══════════════════════════════════════════════════════════════════════════════
// Shared helper functions for all test files.
// ══════════════════════════════════════════════════════════════════════════════

import { db } from '../index';
import { users, games, friendships, sessions, messages, tournaments, analytics } from '../schema';
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
	// 1. Analytics depend on Users/Games/Tournaments
	// 2. Messages depend on Users/Games
	// 3. Sessions depend on Users
	// 4. Friendships depend on Users
	// 5. Games depend on Users
	// 6. Tournaments depend on Users
	// 7. Users have no dependencies
	await db.delete(analytics).execute().catch(() => {});
	await db.delete(messages).execute().catch(() => {});
	await db.delete(sessions).execute().catch(() => {});
	await db.delete(friendships).execute().catch(() => {});
	await db.delete(games).execute().catch(() => {});
	await db.delete(tournaments).execute().catch(() => {});
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
				is_online: false,
				games_played: 0,
				wins: 0,
				losses: 0
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
		games_played: number;
		wins: number;
		losses: number;
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
			is_online: overrides.is_online ?? false,
			games_played: overrides.games_played ?? 0,
			wins: overrides.wins ?? 0,
			losses: overrides.losses ?? 0
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
// 💬 MESSAGE HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a test message between users (optionally tied to a game)
 */
export async function createTestMessage(
	senderId: number,
	options: Partial<{
		recipient_id: number | null;
		game_id: number | null;
		type: string;
		content: string;
		is_read: boolean;
		read_at: Date | null;
	}> = {}
) {
	const [message] = await db
		.insert(messages)
		.values({
			sender_id: senderId,
			recipient_id: options.recipient_id ?? null,
			game_id: options.game_id ?? null,
			type: options.type ?? 'chat',
			content: options.content ?? 'Test message',
			is_read: options.is_read ?? false,
			read_at: options.read_at ?? null
		})
		.returning();

	return message;
}

// ══════════════════════════════════════════════════════════════════════════════
// 🏆 TOURNAMENT HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a test tournament
 */
export async function createTestTournament(
	creatorId: number,
	options: Partial<{
		name: string;
		description: string | null;
		game_type: string;
		status: string;
		max_players: number;
		player_1_id: number;
		player_2_id: number | null;
		player_3_id: number | null;
		player_4_id: number | null;
		winner_id: number | null;
		started_at: Date | null;
		finished_at: Date | null;
	}> = {}
) {
	const [tournament] = await db
		.insert(tournaments)
		.values({
			name: options.name ?? 'Test Tournament',
			description: options.description ?? null,
			game_type: options.game_type ?? 'pong',
			status: options.status ?? 'scheduled',
			max_players: options.max_players ?? 4,
			player_1_id: options.player_1_id ?? creatorId,
			player_2_id: options.player_2_id ?? null,
			player_3_id: options.player_3_id ?? null,
			player_4_id: options.player_4_id ?? null,
			created_by: creatorId,
			winner_id: options.winner_id ?? null,
			started_at: options.started_at ?? null,
			finished_at: options.finished_at ?? null
		})
		.returning();

	return tournament;
}

// ══════════════════════════════════════════════════════════════════════════════
// 📊 ANALYTICS HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a test analytics event
 */
export async function createTestAnalytics(
	options: Partial<{
		user_id: number | null;
		game_id: number | null;
		tournament_id: number | null;
		event_type: string;
		metadata: string | null;
	}> = {}
) {
	const [event] = await db
		.insert(analytics)
		.values({
			user_id: options.user_id ?? null,
			game_id: options.game_id ?? null,
			tournament_id: options.tournament_id ?? null,
			event_type: options.event_type ?? 'test_event',
			metadata: options.metadata ?? null
		})
		.returning();

	return event;
}

// ══════════════════════════════════════════════════════════════════════════════
// 🕒 SESSION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a test session
 */
export async function createTestSession(
	userId: number,
	options: Partial<{
		id: string;
		expiresAt: Date;
	}> = {}
) {
	const timestamp = Date.now();
	const [session] = await db
		.insert(sessions)
		.values({
			id: options.id ?? `session_${timestamp}_${Math.random().toString(36).slice(2)}`,
			userId,
			expiresAt: options.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000)
		})
		.returning();

	return session;
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
	const allMessages = await db.select().from(messages);
	const allTournaments = await db.select().from(tournaments);
	const allAnalytics = await db.select().from(analytics);
	const allSessions = await db.select().from(sessions);

	console.log('\n📊 Current Database State:');
	console.log(`   Users: ${allUsers.length}`);
	console.log(`   Games: ${allGames.length}`);
	console.log(`   Friendships: ${allFriendships.length}`);
	console.log(`   Messages: ${allMessages.length}`);
	console.log(`   Tournaments: ${allTournaments.length}`);
	console.log(`   Analytics: ${allAnalytics.length}`);
	console.log(`   Sessions: ${allSessions.length}`);

	if (allUsers.length > 0) {
		console.log('\n   Users:');
		allUsers.forEach((u) => console.log(`     - ${u.id}: ${u.username}`));
	}

	return {
		users: allUsers,
		games: allGames,
		friendships: allFriendships,
		messages: allMessages,
		tournaments: allTournaments,
		analytics: allAnalytics,
		sessions: allSessions
	};
}