// src/lib/server/db/seed.ts — Development seed for main database
// Usage: npm run db:seed
import 'dotenv/config';
import { users, games, friendships, sessions, messages, tournaments, analytics, tournamentParticipants, achievement_definitions, achievements, player_progression } from './schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { hash } from '@node-rs/argon2';


// ══════════════════════════════════════════════════════════════════════════════
// Database connection
// ══════════════════════════════════════════════════════════════════════════════
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('DATABASE_URL not found in environment!');
	process.exit(1);
}

console.log('Connecting to:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

const client = postgres(DATABASE_URL);
const db = drizzle(client);

// All seed users share this password
const SHARED_PASSWORD = '123321Pa';

async function hashPassword(password: string): Promise<string> {
	return await hash(password, {
		memoryCost: 65536,
		timeCost: 3,
		outputLen: 32,
		parallelism: 1
	});
}

// ══════════════════════════════════════════════════════════════════════════════
// Helper functions
// ══════════════════════════════════════════════════════════════════════════════
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);

/** Pick a random element from an array */
function pick<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

/** Random integer between min and max (inclusive) */
function randInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ══════════════════════════════════════════════════════════════════════════════
// Seed data
// ══════════════════════════════════════════════════════════════════════════════

async function seed() {
	console.log('\n--- SEEDING DATABASE ---\n');

	// Step 1: Clean existing data (order matters for FK constraints)
	console.log('Cleaning existing data...');
	await db.delete(analytics).execute().catch(() => {});
	await db.delete(messages).execute().catch(() => {});
	await db.delete(sessions).execute().catch(() => {});
	await db.delete(achievements).execute().catch(() => {});
	await db.delete(player_progression).execute().catch(() => {});
	await db.delete(friendships).execute();
	await db.delete(games).execute();
	await db.delete(tournamentParticipants).execute();
	await db.delete(tournaments).execute();
	await db.delete(users).execute();
	console.log('  Done\n');

	// Step 2: Hash the shared password once
	console.log('Hashing password...');
	const passwordHash = await hashPassword(SHARED_PASSWORD);
	console.log(`  All users will have password: ${SHARED_PASSWORD}\n`);

	// ══════════════════════════════════════════════════════════════════════════
	// Step 3: Create users (12 users with varied profiles)
	// ══════════════════════════════════════════════════════════════════════════
	console.log('Creating users...');

	const usersData = [
		// 0-4: Active players with lots of matches
		{ username: 'alice',   name: 'Alice Anderson',  email: 'alice@pong.local',   bio: 'Pong champion since day one', avatar: '/avatars/defaults/animals/cat.svg' },
		{ username: 'bob',     name: 'Bob Builder',     email: 'bob@pong.local',     bio: 'Can I fix it? Yes I can!', avatar: '/avatars/defaults/animals/robot.svg' },
		{ username: 'charlie', name: 'Charlie Chen',    email: 'charlie@pong.local', bio: 'Always up for a match', avatar: '/avatars/defaults/retro/ninja.svg' },
		{ username: 'diana',   name: 'Diana Davis',     email: 'diana@pong.local',   bio: 'Fast reflexes, faster wins', avatar: '/avatars/defaults/animals/astronaut.svg' },
		{ username: 'eve',     name: 'Eve Edwards',     email: 'eve@pong.local',     bio: 'The comeback queen', avatar: '/avatars/defaults/retro/alien.svg' },
		// 5-7: Medium activity players
		{ username: 'frank',   name: 'Frank Fisher',    email: 'frank@pong.local',   bio: 'Weekend warrior', avatar: '/avatars/defaults/animals/owl.svg' },
		{ username: 'grace',   name: 'Grace Garcia',    email: 'grace@pong.local',   bio: 'New to pong but learning fast', avatar: '/avatars/defaults/animals/panda.svg' },
		{ username: 'henry',   name: 'Henry Hill',      email: 'henry@pong.local',   bio: 'I play for fun', avatar: null },
		// 8-9: Your test accounts
		{ username: 'test',    name: 'Test Ivanov',     email: 'test@pong.local',    bio: 'I love music', avatar: null },
		{ username: 'tatty',   name: 'Tatty Ramos',     email: 'tatty@pong.local',   bio: 'I like to play games', avatar: null },
		// 10-11: Extra players for variety
		{ username: 'iris',    name: 'Iris Ingram',     email: 'iris@pong.local',    bio: 'Chill mode only', avatar: null },
		{ username: 'jake',    name: 'Jake Johnson',    email: 'jake@pong.local',    bio: null, avatar: null },
		// 12-21: Similar/confusable names for search testing
		{ username: 'alice_99',  name: 'Alice Nguyen',     email: 'alice99@pong.local',   bio: 'Not the other Alice', avatar: null },
		{ username: 'al1ce',     name: 'Alicia Romero',    email: 'al1ce@pong.local',     bio: 'Pong newbie',         avatar: '/avatars/defaults/retro/alien.svg' },
		{ username: 'alison',    name: 'Alison Baker',     email: 'alison@pong.local',    bio: 'Just vibing',         avatar: null },
		{ username: 'bob_jr',    name: 'Bobby Martinez',   email: 'bobjr@pong.local',     bio: 'Like bob but smaller', avatar: null },
		{ username: 'bobby',     name: 'Bob Williams',     email: 'bobby@pong.local',     bio: null,                  avatar: '/avatars/defaults/animals/panda.svg' },
		{ username: 'tester',    name: 'Tester McTest',    email: 'tester@pong.local',    bio: 'Testing everything',  avatar: null },
		{ username: 'testking',  name: 'Test King',        email: 'testking@pong.local',  bio: 'King of testing',     avatar: null },
		{ username: 'tatiana',   name: 'Tatiana Lopez',    email: 'tatiana@pong.local',   bio: 'Love pong',           avatar: '/avatars/defaults/animals/owl.svg' },
		{ username: 'charlotte', name: 'Charlotte Brown',  email: 'charlotte@pong.local', bio: 'Not charlie',         avatar: null },
		{ username: 'chuck',     name: 'Charles Daniels',  email: 'chuck@pong.local',     bio: 'Call me Chuck',       avatar: null },
	];

	const createdUsers: { id: number; username: string }[] = [];

	for (const userData of usersData) {
		const [user] = await db
			.insert(users)
			.values({
				username: userData.username,
				name: userData.name,
				email: userData.email,
				password_hash: passwordHash,
				bio: userData.bio,
				avatar_url: userData.avatar,
				is_online: false,
				terms_accepted_at: new Date()
			})
			.returning({ id: users.id, username: users.username });

		createdUsers.push(user);
		console.log(`  ${user.username} (ID: ${user.id})`);
	}

	// Helper to find user by index
	const u = (i: number) => createdUsers[i];

	// ══════════════════════════════════════════════════════════════════════════
	// Step 4: Create friendships (richer social network)
	// ══════════════════════════════════════════════════════════════════════════
	console.log('\nCreating friendships...');

	const friendshipPairs = [
		// alice's friends (popular — 6 friends)
		{ user: 0, friend: 1, status: 'accepted' as const },  // alice <-> bob
		{ user: 0, friend: 2, status: 'accepted' as const },  // alice <-> charlie
		{ user: 0, friend: 3, status: 'accepted' as const },  // alice <-> diana
		{ user: 0, friend: 4, status: 'accepted' as const },  // alice <-> eve
		{ user: 0, friend: 5, status: 'accepted' as const },  // alice <-> frank
		{ user: 0, friend: 8, status: 'accepted' as const },  // alice <-> Test

		// bob's friends
		{ user: 1, friend: 2, status: 'accepted' as const },  // bob <-> charlie
		{ user: 1, friend: 4, status: 'accepted' as const },  // bob <-> eve
		{ user: 1, friend: 5, status: 'accepted' as const },  // bob <-> frank
		{ user: 1, friend: 9, status: 'accepted' as const },  // bob <-> Tatty

		// charlie's friends
		{ user: 2, friend: 3, status: 'accepted' as const },  // charlie <-> diana
		{ user: 2, friend: 6, status: 'accepted' as const },  // charlie <-> grace
		{ user: 2, friend: 10, status: 'accepted' as const }, // charlie <-> iris

		// diana's friends
		{ user: 3, friend: 4, status: 'accepted' as const },  // diana <-> eve
		{ user: 3, friend: 7, status: 'accepted' as const },  // diana <-> henry

		// eve's friends
		{ user: 4, friend: 6, status: 'accepted' as const },  // eve <-> grace

		// Test & Tatty friends
		{ user: 8, friend: 9, status: 'accepted' as const },  // Test <-> Tatty
		{ user: 8, friend: 1, status: 'accepted' as const },  // Test <-> bob
		{ user: 9, friend: 2, status: 'accepted' as const },  // Tatty <-> charlie

		// New users — accepted friends
		{ user: 8, friend: 12, status: 'accepted' as const },  // Test <-> alice_99
		{ user: 8, friend: 17, status: 'accepted' as const },  // Test <-> tester
		{ user: 8, friend: 18, status: 'accepted' as const },  // Test <-> testking
		{ user: 8, friend: 19, status: 'accepted' as const },  // Test <-> tatiana
		{ user: 9, friend: 19, status: 'accepted' as const },  // Tatty <-> tatiana
		{ user: 9, friend: 15, status: 'accepted' as const },  // Tatty <-> bob_jr
		{ user: 0, friend: 12, status: 'accepted' as const },  // alice <-> alice_99
		{ user: 0, friend: 13, status: 'accepted' as const },  // alice <-> al1ce
		{ user: 1, friend: 15, status: 'accepted' as const },  // bob <-> bob_jr
		{ user: 1, friend: 16, status: 'accepted' as const },  // bob <-> bobby
		{ user: 2, friend: 20, status: 'accepted' as const },  // charlie <-> charlotte
		{ user: 2, friend: 21, status: 'accepted' as const },  // charlie <-> chuck

		// pending requests
		{ user: 3, friend: 5, status: 'pending' as const },    // diana -> frank
		{ user: 6, friend: 0, status: 'pending' as const },    // grace -> alice
		{ user: 11, friend: 0, status: 'pending' as const },   // jake -> alice
		{ user: 10, friend: 8, status: 'pending' as const },   // iris -> Test
		{ user: 7, friend: 9, status: 'pending' as const },    // henry -> Tatty
		{ user: 14, friend: 8, status: 'pending' as const },   // alison -> Test
		{ user: 20, friend: 8, status: 'pending' as const },   // charlotte -> Test
		{ user: 8, friend: 16, status: 'pending' as const },   // Test -> bobby (sent)
		{ user: 8, friend: 21, status: 'pending' as const },   // Test -> chuck (sent)
		{ user: 9, friend: 20, status: 'pending' as const },   // Tatty -> charlotte (sent)

		// blocked relationships
		{ user: 8, friend: 11, status: 'blocked' as const },   // Test blocked jake
		{ user: 9, friend: 13, status: 'blocked' as const },   // Tatty blocked al1ce
	];

	for (const pair of friendshipPairs) {
		await db.insert(friendships).values({
			user_id: u(pair.user).id,
			friend_id: u(pair.friend).id,
			status: pair.status
		});
		const arrow = pair.status === 'accepted' ? '<->' : ' ->';
		console.log(`  ${u(pair.user).username} ${arrow} ${u(pair.friend).username} (${pair.status})`);
	}

	// ══════════════════════════════════════════════════════════════════════════
	// Step 5: Create match history (50+ games, mixed modes/speeds/dates)
	// ══════════════════════════════════════════════════════════════════════════
	console.log('\nCreating match history...');

	type GameSeed = {
		p1: number; p2: number | null; p2name?: string;
		s1: number; s2: number;
		mode: string; speed: string; wscore: number;
		dur: number; date: Date;
	};

	const gamesData: GameSeed[] = [
		// ── Week 4 ago: Early matches ──────────────────────────────
		{ p1: 0, p2: 1,    s1: 5, s2: 3, mode: 'online',   speed: 'normal', wscore: 5, dur: 180, date: daysAgo(28) },
		{ p1: 2, p2: 3,    s1: 5, s2: 4, mode: 'online',   speed: 'normal', wscore: 5, dur: 200, date: daysAgo(27) },
		{ p1: 0, p2: null, p2name: 'Computer', s1: 5, s2: 1, mode: 'computer', speed: 'chill', wscore: 5, dur: 90, date: daysAgo(27) },
		{ p1: 4, p2: 5,    s1: 3, s2: 5, mode: 'online',   speed: 'fast',   wscore: 5, dur: 110, date: daysAgo(26) },
		{ p1: 1, p2: null, p2name: 'Computer', s1: 5, s2: 2, mode: 'computer', speed: 'normal', wscore: 5, dur: 120, date: daysAgo(26) },
		{ p1: 8, p2: 9,    s1: 5, s2: 3, mode: 'local',    speed: 'normal', wscore: 5, dur: 160, date: daysAgo(25) },

		// ── Week 3 ago: More varied ────────────────────────────────
		{ p1: 0, p2: 2,    s1: 4, s2: 5, mode: 'online',   speed: 'fast',   wscore: 5, dur: 150, date: daysAgo(21) },
		{ p1: 1, p2: 2,    s1: 7, s2: 5, mode: 'online',   speed: 'normal', wscore: 7, dur: 240, date: daysAgo(20) },
		{ p1: 3, p2: 4,    s1: 5, s2: 2, mode: 'online',   speed: 'chill',  wscore: 5, dur: 200, date: daysAgo(19) },
		{ p1: 5, p2: 6,    s1: 5, s2: 4, mode: 'online',   speed: 'normal', wscore: 5, dur: 185, date: daysAgo(19) },
		{ p1: 0, p2: null, p2name: 'Computer', s1: 5, s2: 0, mode: 'computer', speed: 'chill', wscore: 5, dur: 75, date: daysAgo(18) },
		{ p1: 8, p2: null, p2name: 'Computer', s1: 3, s2: 5, mode: 'computer', speed: 'fast', wscore: 5, dur: 100, date: daysAgo(18) },
		{ p1: 0, p2: 3,    s1: 5, s2: 1, mode: 'online',   speed: 'normal', wscore: 5, dur: 120, date: daysAgo(17) },
		{ p1: 1, p2: 4,    s1: 3, s2: 5, mode: 'online',   speed: 'normal', wscore: 5, dur: 160, date: daysAgo(17) },
		{ p1: 9, p2: null, p2name: 'Guest',    s1: 5, s2: 2, mode: 'local',  speed: 'chill',  wscore: 5, dur: 140, date: daysAgo(16) },
		{ p1: 7, p2: 10,   s1: 5, s2: 3, mode: 'online',   speed: 'normal', wscore: 5, dur: 170, date: daysAgo(16) },

		// ── Week 2 ago: Intensity ramps up ─────────────────────────
		{ p1: 2, p2: 3,    s1: 11, s2: 9, mode: 'online',  speed: 'fast',   wscore: 11, dur: 420, date: daysAgo(14) },
		{ p1: 0, p2: 4,    s1: 5, s2: 4, mode: 'online',   speed: 'normal', wscore: 5,  dur: 190, date: daysAgo(13) },
		{ p1: 1, p2: 3,    s1: 5, s2: 0, mode: 'online',   speed: 'fast',   wscore: 5,  dur: 90,  date: daysAgo(13) },
		{ p1: 5, p2: null, p2name: 'Computer', s1: 5, s2: 3, mode: 'computer', speed: 'normal', wscore: 5, dur: 130, date: daysAgo(12) },
		{ p1: 0, p2: 5,    s1: 5, s2: 2, mode: 'online',   speed: 'normal', wscore: 5,  dur: 140, date: daysAgo(12) },
		{ p1: 6, p2: null, p2name: 'Computer', s1: 2, s2: 5, mode: 'computer', speed: 'chill', wscore: 5, dur: 160, date: daysAgo(11) },
		{ p1: 8, p2: 1,    s1: 5, s2: 4, mode: 'online',   speed: 'normal', wscore: 5,  dur: 195, date: daysAgo(11) },
		{ p1: 2, p2: 4,    s1: 5, s2: 5, mode: 'online',   speed: 'fast',   wscore: 7,  dur: 250, date: daysAgo(10) },
		// ^ tie at wscore 5 means game continued — charlie 5, eve 5 but wscore=7 so let's fix:
		{ p1: 2, p2: 4,    s1: 7, s2: 5, mode: 'online',   speed: 'fast',   wscore: 7,  dur: 250, date: daysAgo(10) },
		{ p1: 9, p2: 2,    s1: 3, s2: 5, mode: 'online',   speed: 'normal', wscore: 5,  dur: 155, date: daysAgo(10) },
		{ p1: 0, p2: 1,    s1: 3, s2: 5, mode: 'online',   speed: 'normal', wscore: 5,  dur: 175, date: daysAgo(9) },
		{ p1: 8, p2: null, p2name: 'Guest', s1: 5, s2: 1, mode: 'local', speed: 'normal', wscore: 5, dur: 85, date: daysAgo(9) },

		// ── Last week: High activity ───────────────────────────────
		{ p1: 0, p2: 2,    s1: 5, s2: 3, mode: 'online',   speed: 'fast',   wscore: 5, dur: 130, date: daysAgo(7) },
		{ p1: 3, p2: 7,    s1: 5, s2: 1, mode: 'online',   speed: 'normal', wscore: 5, dur: 100, date: daysAgo(7) },
		{ p1: 1, p2: 5,    s1: 5, s2: 4, mode: 'online',   speed: 'normal', wscore: 5, dur: 180, date: daysAgo(6) },
		{ p1: 4, p2: 6,    s1: 5, s2: 0, mode: 'online',   speed: 'chill',  wscore: 5, dur: 95,  date: daysAgo(6) },
		{ p1: 8, p2: 9,    s1: 3, s2: 5, mode: 'local',    speed: 'fast',   wscore: 5, dur: 110, date: daysAgo(6) },
		{ p1: 0, p2: null, p2name: 'Computer', s1: 5, s2: 0, mode: 'computer', speed: 'fast', wscore: 5, dur: 60, date: daysAgo(5) },
		{ p1: 10, p2: 11,  s1: 5, s2: 3, mode: 'online',   speed: 'normal', wscore: 5, dur: 165, date: daysAgo(5) },
		{ p1: 2, p2: 5,    s1: 3, s2: 5, mode: 'online',   speed: 'normal', wscore: 5, dur: 170, date: daysAgo(5) },
		{ p1: 0, p2: 3,    s1: 5, s2: 2, mode: 'online',   speed: 'normal', wscore: 5, dur: 135, date: daysAgo(4) },
		{ p1: 1, p2: 2,    s1: 5, s2: 3, mode: 'online',   speed: 'fast',   wscore: 5, dur: 125, date: daysAgo(4) },
		{ p1: 9, p2: null, p2name: 'Computer', s1: 5, s2: 4, mode: 'computer', speed: 'normal', wscore: 5, dur: 175, date: daysAgo(4) },
		{ p1: 4, p2: 3,    s1: 5, s2: 3, mode: 'online',   speed: 'normal', wscore: 5, dur: 155, date: daysAgo(3) },
		{ p1: 0, p2: 4,    s1: 5, s2: 5, mode: 'online',   speed: 'fast',   wscore: 7, dur: 280, date: daysAgo(3) },
		// ^ another extended game: fix score
		{ p1: 0, p2: 4,    s1: 7, s2: 5, mode: 'online',   speed: 'fast',   wscore: 7, dur: 280, date: daysAgo(3) },
		{ p1: 8, p2: 0,    s1: 2, s2: 5, mode: 'online',   speed: 'normal', wscore: 5, dur: 145, date: daysAgo(3) },

		// ── Last 2 days: Recent matches ────────────────────────────
		{ p1: 1, p2: 0,    s1: 5, s2: 2, mode: 'online',   speed: 'normal', wscore: 5, dur: 130, date: daysAgo(2) },
		{ p1: 2, p2: 0,    s1: 3, s2: 5, mode: 'online',   speed: 'fast',   wscore: 5, dur: 115, date: daysAgo(2) },
		{ p1: 5, p2: 7,    s1: 5, s2: 1, mode: 'online',   speed: 'chill',  wscore: 5, dur: 105, date: daysAgo(2) },
		{ p1: 8, p2: null, p2name: 'Computer', s1: 5, s2: 0, mode: 'computer', speed: 'normal', wscore: 5, dur: 70, date: daysAgo(1) },
		{ p1: 9, p2: 8,    s1: 5, s2: 4, mode: 'local',    speed: 'normal', wscore: 5, dur: 190, date: daysAgo(1) },
		{ p1: 0, p2: 1,    s1: 5, s2: 3, mode: 'online',   speed: 'normal', wscore: 5, dur: 165, date: hoursAgo(12) },
		{ p1: 3, p2: 2,    s1: 5, s2: 4, mode: 'online',   speed: 'fast',   wscore: 5, dur: 140, date: hoursAgo(8) },
		{ p1: 4, p2: 1,    s1: 5, s2: 2, mode: 'online',   speed: 'normal', wscore: 5, dur: 120, date: hoursAgo(6) },
		{ p1: 0, p2: null, p2name: 'Computer', s1: 5, s2: 1, mode: 'computer', speed: 'fast', wscore: 5, dur: 55, date: hoursAgo(4) },
		{ p1: 8, p2: 9,    s1: 5, s2: 2, mode: 'local',    speed: 'normal', wscore: 5, dur: 135, date: hoursAgo(3) },
		{ p1: 0, p2: 5,    s1: 11, s2: 9, mode: 'online',  speed: 'normal', wscore: 11, dur: 450, date: hoursAgo(2) },
		{ p1: 1, p2: 3,    s1: 3, s2: 5, mode: 'online',   speed: 'chill',  wscore: 5, dur: 200, date: hoursAgo(1) },
	];

	// Remove the duplicate/broken entries (lines with s1=5,s2=5 followed by corrected version)
	const cleanGames = gamesData.filter((g, i) => {
		// Skip entries where scores don't make sense (both equal wscore)
		if (g.s1 === g.s2) return false;
		// Skip if the winner's score doesn't match wscore
		const winnerScore = Math.max(g.s1, g.s2);
		if (winnerScore !== g.wscore) return false;
		return true;
	});

	// Track wins/losses per user
	const stats: Record<number, { wins: number; losses: number; played: number; pointsScored: number; shutouts: number }> = {};
	for (const cu of createdUsers) {
		stats[cu.id] = { wins: 0, losses: 0, played: 0, pointsScored: 0, shutouts: 0 };
	}

	for (const game of cleanGames) {
		const p1Id = u(game.p1).id;
		const p2Id = game.p2 !== null ? u(game.p2).id : null;
		const winnerId = game.s1 > game.s2 ? p1Id : (p2Id ?? p1Id);
		const loserId = winnerId === p1Id ? p2Id : p1Id;
		const winnerName = game.s1 > game.s2 ? u(game.p1).username : (game.p2 !== null ? u(game.p2).username : game.p2name ?? 'Computer');
		const loserScore = Math.min(game.s1, game.s2);

		await db.insert(games).values({
			type: 'pong',
			status: 'finished',
			game_mode: game.mode,
			player1_id: p1Id,
			player2_id: p2Id,
			player2_name: game.p2 !== null ? u(game.p2).username : (game.p2name ?? 'Guest'),
			player1_score: game.s1,
			player2_score: game.s2,
			winner_id: winnerId,
			winner_name: winnerName,
			winner_score: game.wscore,
			speed_preset: game.speed,
			duration_seconds: game.dur,
			started_at: game.date,
			finished_at: new Date(game.date.getTime() + game.dur * 1000)
		});

		// Update stats
		stats[p1Id].played++;
		stats[p1Id].pointsScored += game.s1;
		if (p2Id) {
			stats[p2Id].played++;
			stats[p2Id].pointsScored += game.s2;
		}

		if (winnerId === p1Id) {
			stats[p1Id].wins++;
			if (p2Id) stats[p2Id].losses++;
			if (loserScore === 0) stats[p1Id].shutouts++;
		} else if (p2Id) {
			stats[p2Id].wins++;
			stats[p1Id].losses++;
			if (loserScore === 0 && p2Id) stats[p2Id].shutouts++;
		}

		const p2Display = game.p2 !== null ? u(game.p2).username : (game.p2name ?? 'Computer');
		console.log(`  ${u(game.p1).username} ${game.s1}-${game.s2} ${p2Display}  [${game.mode}/${game.speed}] (winner: ${winnerName})`);
	}

	console.log(`  Total games seeded: ${cleanGames.length}`);

	// ══════════════════════════════════════════════════════════════════════════
	// Step 6: Update user stats
	// ══════════════════════════════════════════════════════════════════════════
	console.log('\nUpdating user stats...');
	for (const cu of createdUsers) {
		const s = stats[cu.id];
		if (s.played > 0) {
			await db.update(users).set({
				games_played: s.played,
				wins: s.wins,
				losses: s.losses
			}).where(eq(users.id, cu.id));
			console.log(`  ${cu.username}: ${s.wins}W ${s.losses}L (${s.played} games)`);
		}
	}

	// ══════════════════════════════════════════════════════════════════════════
	// Step 6b: Seed player progression (varied levels and XP)
	// ══════════════════════════════════════════════════════════════════════════
	console.log('\nSeeding player progression...');

	const progressionData = [
		// alice — high level, lots of XP, strong streaks
		{ idx: 0,  level: 8,  totalXp: 2200, currentXp: 100, xpToNext: 300, winStreak: 3, bestStreak: 5, pointsScored: 0, shutouts: 0, comebacks: 2, ballReturns: 450, daysPlayed: 12 },
		// bob — solid mid-level
		{ idx: 1,  level: 6,  totalXp: 1400, currentXp: 80,  xpToNext: 250, winStreak: 1, bestStreak: 3, pointsScored: 0, shutouts: 0, comebacks: 1, ballReturns: 320, daysPlayed: 9 },
		// charlie — competitive, good streaks
		{ idx: 2,  level: 7,  totalXp: 1800, currentXp: 150, xpToNext: 300, winStreak: 2, bestStreak: 4, pointsScored: 0, shutouts: 0, comebacks: 3, ballReturns: 380, daysPlayed: 10 },
		// diana — casual but decent
		{ idx: 3,  level: 5,  totalXp: 900,  currentXp: 50,  xpToNext: 200, winStreak: 1, bestStreak: 2, pointsScored: 0, shutouts: 0, comebacks: 0, ballReturns: 220, daysPlayed: 7 },
		// eve — comeback specialist
		{ idx: 4,  level: 5,  totalXp: 850,  currentXp: 100, xpToNext: 200, winStreak: 2, bestStreak: 3, pointsScored: 0, shutouts: 0, comebacks: 4, ballReturns: 280, daysPlayed: 8 },
		// frank — medium
		{ idx: 5,  level: 4,  totalXp: 600,  currentXp: 50,  xpToNext: 200, winStreak: 1, bestStreak: 2, pointsScored: 0, shutouts: 0, comebacks: 0, ballReturns: 180, daysPlayed: 5 },
		// grace — beginner
		{ idx: 6,  level: 2,  totalXp: 150,  currentXp: 50,  xpToNext: 100, winStreak: 0, bestStreak: 1, pointsScored: 0, shutouts: 0, comebacks: 0, ballReturns: 80,  daysPlayed: 3 },
		// henry — casual
		{ idx: 7,  level: 3,  totalXp: 280,  currentXp: 30,  xpToNext: 150, winStreak: 0, bestStreak: 1, pointsScored: 0, shutouts: 0, comebacks: 0, ballReturns: 120, daysPlayed: 4 },
		// Test — your main test account
		{ idx: 8,  level: 4,  totalXp: 550,  currentXp: 50,  xpToNext: 200, winStreak: 1, bestStreak: 2, pointsScored: 0, shutouts: 0, comebacks: 1, ballReturns: 200, daysPlayed: 6 },
		// Tatty — your other test account
		{ idx: 9,  level: 3,  totalXp: 320,  currentXp: 70,  xpToNext: 150, winStreak: 0, bestStreak: 1, pointsScored: 0, shutouts: 0, comebacks: 0, ballReturns: 150, daysPlayed: 5 },
		// iris — chill player
		{ idx: 10, level: 2,  totalXp: 120,  currentXp: 20,  xpToNext: 100, winStreak: 1, bestStreak: 1, pointsScored: 0, shutouts: 0, comebacks: 0, ballReturns: 60,  daysPlayed: 2 },
		// jake — newest
		{ idx: 11, level: 1,  totalXp: 40,   currentXp: 40,  xpToNext: 50,  winStreak: 0, bestStreak: 0, pointsScored: 0, shutouts: 0, comebacks: 0, ballReturns: 30,  daysPlayed: 1 },
		// new users — varied levels
		{ idx: 12, level: 3,  totalXp: 300,  currentXp: 50,  xpToNext: 150, winStreak: 1, bestStreak: 2, pointsScored: 0, shutouts: 0, comebacks: 0, ballReturns: 100, daysPlayed: 4 },
		{ idx: 13, level: 1,  totalXp: 30,   currentXp: 30,  xpToNext: 50,  winStreak: 0, bestStreak: 0, pointsScored: 0, shutouts: 0, comebacks: 0, ballReturns: 20,  daysPlayed: 1 },
		{ idx: 14, level: 2,  totalXp: 100,  currentXp: 0,   xpToNext: 100, winStreak: 0, bestStreak: 1, pointsScored: 0, shutouts: 0, comebacks: 0, ballReturns: 50,  daysPlayed: 2 },
		{ idx: 15, level: 2,  totalXp: 140,  currentXp: 40,  xpToNext: 100, winStreak: 0, bestStreak: 1, pointsScored: 0, shutouts: 0, comebacks: 0, ballReturns: 60,  daysPlayed: 3 },
		{ idx: 16, level: 3,  totalXp: 250,  currentXp: 0,   xpToNext: 150, winStreak: 1, bestStreak: 1, pointsScored: 0, shutouts: 0, comebacks: 0, ballReturns: 90,  daysPlayed: 3 },
		{ idx: 17, level: 4,  totalXp: 500,  currentXp: 0,   xpToNext: 200, winStreak: 0, bestStreak: 2, pointsScored: 0, shutouts: 0, comebacks: 1, ballReturns: 160, daysPlayed: 5 },
		{ idx: 18, level: 3,  totalXp: 280,  currentXp: 30,  xpToNext: 150, winStreak: 1, bestStreak: 2, pointsScored: 0, shutouts: 0, comebacks: 0, ballReturns: 95,  daysPlayed: 4 },
		{ idx: 19, level: 5,  totalXp: 800,  currentXp: 50,  xpToNext: 200, winStreak: 2, bestStreak: 3, pointsScored: 0, shutouts: 0, comebacks: 1, ballReturns: 240, daysPlayed: 7 },
		{ idx: 20, level: 2,  totalXp: 110,  currentXp: 10,  xpToNext: 100, winStreak: 0, bestStreak: 1, pointsScored: 0, shutouts: 0, comebacks: 0, ballReturns: 45,  daysPlayed: 2 },
		{ idx: 21, level: 1,  totalXp: 50,   currentXp: 50,  xpToNext: 50,  winStreak: 0, bestStreak: 0, pointsScored: 0, shutouts: 0, comebacks: 0, ballReturns: 25,  daysPlayed: 1 },
	];

	for (const p of progressionData) {
		const userId = u(p.idx).id;
		const s = stats[userId];
		await db.insert(player_progression).values({
			user_id: userId,
			current_level: p.level,
			total_xp: p.totalXp,
			current_xp: p.currentXp,
			xp_to_next_level: p.xpToNext,
			current_win_streak: p.winStreak,
			best_win_streak: p.bestStreak,
			total_points_scored: s.pointsScored || p.pointsScored,
			shutout_wins: s.shutouts || p.shutouts,
			comeback_wins: p.comebacks,
			total_ball_returns: p.ballReturns,
			consecutive_days_played: p.daysPlayed,
			last_played_at: hoursAgo(p.idx * 2 + 1),
		});
		console.log(`  ${u(p.idx).username}: Level ${p.level}, ${p.totalXp} XP, streak ${p.winStreak}/${p.bestStreak}`);
	}

	// ══════════════════════════════════════════════════════════════════════════
	// Step 7: Seed achievement definitions
	// ══════════════════════════════════════════════════════════════════════════
	console.log('\nSeeding achievement definitions...');

	const achievementDefs = [
		{ id: 'shutout_bronze',      name: 'Shutout',           tier: 'bronze',    category: 'shutout',    icon: '🛡️', description: 'Win a match where your opponent scores 0 points' },
		{ id: 'shutout_silver',      name: 'Shutout Artist',    tier: 'silver',    category: 'shutout',    icon: '🛡️', description: 'Win 10 shutout matches' },
		{ id: 'streak_bronze',       name: 'Hot Streak',        tier: 'bronze',    category: 'streak',     icon: '🔥', description: 'Win 3 matches in a row' },
		{ id: 'streak_silver',       name: 'On Fire',           tier: 'silver',    category: 'streak',     icon: '🔥', description: 'Win 7 matches in a row' },
		{ id: 'streak_gold',         name: 'Unstoppable',       tier: 'gold',      category: 'streak',     icon: '🔥', description: 'Win 15 matches in a row' },
		{ id: 'points_bronze',       name: 'Point Collector',   tier: 'bronze',    category: 'scorer',     icon: '🎯', description: 'Score 50 career points' },
		{ id: 'points_silver',       name: 'Sharpshooter',      tier: 'silver',    category: 'scorer',     icon: '🎯', description: 'Score 200 career points' },
		{ id: 'points_gold',         name: 'Point Machine',     tier: 'gold',      category: 'scorer',     icon: '🎯', description: 'Score 500 career points' },
		{ id: 'first_match',         name: 'First Match',       tier: 'bronze',    category: 'origins',    icon: '🎮', description: 'Finish one match' },
		{ id: 'first_victory',       name: 'First Victory',     tier: 'bronze',    category: 'origins',    icon: '🥇', description: 'Win your first match' },
		{ id: 'first_defeat',        name: 'First Defeat',      tier: 'bronze',    category: 'origins',    icon: '💔', description: 'Lose your first match' },
		{ id: 'profile_avatar',      name: 'Face of the Game',  tier: 'bronze',    category: 'onboarding', icon: '🖼️', description: 'Upload or select an avatar' },
		{ id: 'profile_bio',         name: 'Express Yourself',  tier: 'bronze',    category: 'onboarding', icon: '✍️', description: 'Write a bio' },
		{ id: 'social_first_friend', name: 'First Friend',      tier: 'bronze',    category: 'social',     icon: '🤝', description: 'Add your first friend' },
		{ id: 'social_circle',       name: 'Social Circle',     tier: 'silver',    category: 'social',     icon: '👥', description: 'Have 5 accepted friends' },
		{ id: 'pvp_first_match',     name: 'First PvP Match',   tier: 'bronze',    category: 'origins',    icon: '🥊', description: 'Play your first online match' },
		{ id: 'pvp_first_win',       name: 'First PvP Win',     tier: 'bronze',    category: 'origins',    icon: '🏅', description: 'Win your first online match' },
		{ id: 'night_owl',           name: 'Night Owl',         tier: 'bronze',    category: 'secret',     icon: '🕒', description: 'Play a match after midnight' },
		{ id: 'veteran_bronze',      name: 'Veteran',           tier: 'bronze',    category: 'dedication', icon: '⭐', description: 'Play 10 matches' },
		{ id: 'veteran_silver',      name: 'Seasoned Player',   tier: 'silver',    category: 'dedication', icon: '⭐', description: 'Play 50 matches' },
		{ id: 'veteran_gold',        name: 'Legend',             tier: 'gold',      category: 'dedication', icon: '⭐', description: 'Play 100 matches' },
		{ id: 'comeback_bronze',     name: 'Comeback Kid',      tier: 'bronze',    category: 'comeback',   icon: '💪', description: 'Win after being down by 3+ points' },
		{ id: 'comeback_silver',     name: 'Never Give Up',     tier: 'silver',    category: 'comeback',   icon: '💪', description: 'Win 5 comeback matches' },
		{ id: 'speed_demon',         name: 'Speed Demon',       tier: 'bronze',    category: 'speed',      icon: '⚡', description: 'Win a match on fast speed' },
		{ id: 'marathon',            name: 'Marathon Match',     tier: 'bronze',    category: 'endurance',  icon: '🏃', description: 'Play a match lasting over 5 minutes' },
	];

	await db.delete(achievement_definitions).execute().catch(() => {});
	await db.insert(achievement_definitions).values(achievementDefs);
	console.log(`  ${achievementDefs.length} definitions seeded`);

	// ══════════════════════════════════════════════════════════════════════════
	// Step 8: Assign achievements to users (varied unlocks)
	// ══════════════════════════════════════════════════════════════════════════
	console.log('\nAssigning achievements to users...');

	const userAchievements = [
		// ── alice — experienced player, many achievements ──
		{ user: 0, achievement: 'first_match',        time: daysAgo(28) },
		{ user: 0, achievement: 'first_victory',      time: daysAgo(28) },
		{ user: 0, achievement: 'pvp_first_match',    time: daysAgo(28) },
		{ user: 0, achievement: 'pvp_first_win',      time: daysAgo(28) },
		{ user: 0, achievement: 'points_bronze',      time: daysAgo(20) },
		{ user: 0, achievement: 'points_silver',      time: daysAgo(7) },
		{ user: 0, achievement: 'streak_bronze',      time: daysAgo(13) },
		{ user: 0, achievement: 'social_first_friend', time: daysAgo(25) },
		{ user: 0, achievement: 'social_circle',      time: daysAgo(15) },
		{ user: 0, achievement: 'profile_bio',        time: daysAgo(28) },
		{ user: 0, achievement: 'profile_avatar',     time: daysAgo(28) },
		{ user: 0, achievement: 'shutout_bronze',     time: daysAgo(18) },
		{ user: 0, achievement: 'veteran_bronze',     time: daysAgo(17) },
		{ user: 0, achievement: 'speed_demon',        time: daysAgo(7) },
		{ user: 0, achievement: 'comeback_bronze',    time: daysAgo(3) },
		{ user: 0, achievement: 'marathon',           time: hoursAgo(2) },

		// ── bob — solid player ──
		{ user: 1, achievement: 'first_match',        time: daysAgo(28) },
		{ user: 1, achievement: 'first_victory',      time: daysAgo(20) },
		{ user: 1, achievement: 'first_defeat',       time: daysAgo(28) },
		{ user: 1, achievement: 'pvp_first_match',    time: daysAgo(28) },
		{ user: 1, achievement: 'pvp_first_win',      time: daysAgo(20) },
		{ user: 1, achievement: 'shutout_bronze',     time: daysAgo(13) },
		{ user: 1, achievement: 'points_bronze',      time: daysAgo(10) },
		{ user: 1, achievement: 'social_first_friend', time: daysAgo(25) },
		{ user: 1, achievement: 'veteran_bronze',     time: daysAgo(9) },
		{ user: 1, achievement: 'profile_bio',        time: daysAgo(26) },
		{ user: 1, achievement: 'profile_avatar',     time: daysAgo(26) },

		// ── charlie — competitive, good streaks ──
		{ user: 2, achievement: 'first_match',        time: daysAgo(21) },
		{ user: 2, achievement: 'first_victory',      time: daysAgo(21) },
		{ user: 2, achievement: 'streak_bronze',      time: daysAgo(10) },
		{ user: 2, achievement: 'pvp_first_match',    time: daysAgo(21) },
		{ user: 2, achievement: 'pvp_first_win',      time: daysAgo(21) },
		{ user: 2, achievement: 'night_owl',          time: daysAgo(5) },
		{ user: 2, achievement: 'points_bronze',      time: daysAgo(14) },
		{ user: 2, achievement: 'speed_demon',        time: daysAgo(14) },
		{ user: 2, achievement: 'social_first_friend', time: daysAgo(20) },
		{ user: 2, achievement: 'profile_bio',        time: daysAgo(21) },
		{ user: 2, achievement: 'profile_avatar',     time: daysAgo(21) },
		{ user: 2, achievement: 'marathon',           time: daysAgo(14) },
		{ user: 2, achievement: 'veteran_bronze',     time: daysAgo(5) },

		// ── diana — casual ──
		{ user: 3, achievement: 'first_match',        time: daysAgo(19) },
		{ user: 3, achievement: 'first_victory',      time: daysAgo(19) },
		{ user: 3, achievement: 'first_defeat',       time: daysAgo(14) },
		{ user: 3, achievement: 'profile_avatar',     time: daysAgo(19) },
		{ user: 3, achievement: 'profile_bio',        time: daysAgo(19) },
		{ user: 3, achievement: 'pvp_first_match',    time: daysAgo(19) },
		{ user: 3, achievement: 'pvp_first_win',      time: daysAgo(19) },
		{ user: 3, achievement: 'social_first_friend', time: daysAgo(17) },

		// ── eve — comeback specialist ──
		{ user: 4, achievement: 'first_match',        time: daysAgo(26) },
		{ user: 4, achievement: 'first_victory',      time: daysAgo(17) },
		{ user: 4, achievement: 'first_defeat',       time: daysAgo(26) },
		{ user: 4, achievement: 'pvp_first_match',    time: daysAgo(26) },
		{ user: 4, achievement: 'pvp_first_win',      time: daysAgo(17) },
		{ user: 4, achievement: 'comeback_bronze',    time: daysAgo(6) },
		{ user: 4, achievement: 'shutout_bronze',     time: daysAgo(6) },
		{ user: 4, achievement: 'social_first_friend', time: daysAgo(20) },

		// ── frank — weekend warrior ──
		{ user: 5, achievement: 'first_match',        time: daysAgo(26) },
		{ user: 5, achievement: 'first_victory',      time: daysAgo(19) },
		{ user: 5, achievement: 'first_defeat',       time: daysAgo(26) },
		{ user: 5, achievement: 'profile_bio',        time: daysAgo(25) },
		{ user: 5, achievement: 'profile_avatar',     time: daysAgo(25) },

		// ── grace — beginner ──
		{ user: 6, achievement: 'first_match',        time: daysAgo(19) },
		{ user: 6, achievement: 'first_defeat',       time: daysAgo(19) },

		// ── henry — casual ──
		{ user: 7, achievement: 'first_match',        time: daysAgo(16) },
		{ user: 7, achievement: 'first_victory',      time: daysAgo(16) },

		// ── Test — your test account ──
		{ user: 8, achievement: 'first_match',        time: daysAgo(25) },
		{ user: 8, achievement: 'first_victory',      time: daysAgo(25) },
		{ user: 8, achievement: 'first_defeat',       time: daysAgo(18) },
		{ user: 8, achievement: 'pvp_first_match',    time: daysAgo(11) },
		{ user: 8, achievement: 'pvp_first_win',      time: daysAgo(11) },
		{ user: 8, achievement: 'shutout_bronze',     time: daysAgo(1) },
		{ user: 8, achievement: 'social_first_friend', time: daysAgo(20) },
		{ user: 8, achievement: 'profile_bio',        time: daysAgo(25) },
		{ user: 8, achievement: 'comeback_bronze',    time: daysAgo(3) },
		{ user: 8, achievement: 'veteran_bronze',     time: daysAgo(9) },

		// ── Tatty — your other test account ──
		{ user: 9, achievement: 'first_match',        time: daysAgo(25) },
		{ user: 9, achievement: 'first_victory',      time: daysAgo(16) },
		{ user: 9, achievement: 'first_defeat',       time: daysAgo(25) },
		{ user: 9, achievement: 'social_first_friend', time: daysAgo(20) },
		{ user: 9, achievement: 'profile_bio',        time: daysAgo(24) },

		// ── iris — new ──
		{ user: 10, achievement: 'first_match',       time: daysAgo(5) },
		{ user: 10, achievement: 'first_victory',     time: daysAgo(5) },

		// ── jake — newest (no achievements yet) ──
	];

	for (const ua of userAchievements) {
		await db.insert(achievements).values({
			user_id: u(ua.user).id,
			achievement_id: ua.achievement,
			unlocked_at: ua.time,
		});
		console.log(`  ${u(ua.user).username} -> ${ua.achievement}`);
	}

	// ══════════════════════════════════════════════════════════════════════════
	// Summary
	// ══════════════════════════════════════════════════════════════════════════
	console.log('\n--- SEED COMPLETE ---');
	console.log(`  Users:          ${createdUsers.length}`);
	console.log(`  Friendships:    ${friendshipPairs.length}`);
	console.log(`  Games:          ${cleanGames.length}`);
	console.log(`  Achievements:   ${userAchievements.length}`);
	console.log(`  Ach. defs:      ${achievementDefs.length}`);
	console.log(`  Progressions:   ${progressionData.length}`);
	console.log(`\n  All passwords: ${SHARED_PASSWORD}`);
	console.log('  Usernames: alice, bob, charlie, diana, eve, frank, grace, henry, Test, Tatty, iris, jake');
	console.log('  + alice_99, al1ce, alison, bob_jr, bobby, tester, testking, tatiana, charlotte, chuck\n');
}

seed()
	.then(() => {
		console.log('Seeding completed successfully!\n');
		process.exit(0);
	})
	.catch((error) => {
		console.error('Seeding failed:', error);
		process.exit(1);
	})
	.finally(() => {
		client.end();
	});
