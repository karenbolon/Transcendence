// src/lib/server/db/seed.ts — Development seed for main database
// Usage: npm run db:seed
import 'dotenv/config';
import { users, games, friendships, sessions, messages, tournaments, analytics, tournamentParticipants, achievement_definitions, achievements } from './schema';
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

	// Step 3: Create users
	console.log('Creating users...');

	const usersData = [
		{ username: 'alice',   name: 'Alice Anderson', email: 'alice@pong.local',   bio: 'Pong champion since day one' },
		{ username: 'bob',     name: 'Bob Builder',    email: 'bob@pong.local',     bio: 'Can I fix it? Yes I can!' },
		{ username: 'charlie', name: 'Charlie Chen',   email: 'charlie@pong.local', bio: 'Always up for a match' },
		{ username: 'diana',   name: 'Diana Davis',    email: 'diana@pong.local',   bio: 'Fast reflexes, faster wins' },
		{ username: 'eve',     name: 'Eve Edwards',    email: 'eve@pong.local',     bio: 'The comeback queen' },
		{ username: 'frank',   name: 'Frank Fisher',   email: 'frank@pong.local',   bio: null },
		{ username: 'grace',   name: 'Grace Garcia',   email: 'grace@pong.local',   bio: 'New to pong but learning fast' },
		{ username: 'henry',   name: 'Henry Hill',     email: 'henry@pong.local',   bio: null },
		{ username: 'Test',    name: 'Test Ivanov',    email: 'test@pong.local',   	bio: 'I love music'},
		{ username: 'Tatty',   name: 'Tatty Ramos',    email: 'tatty@pong.local',   bio: 'I like to play games'},
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
				is_online: false,
				terms_accepted_at: new Date()
			})
			.returning({ id: users.id, username: users.username });

		createdUsers.push(user);
		console.log(`  ${user.username} (ID: ${user.id})`);
	}

	// Helper to find user by index
	const u = (i: number) => createdUsers[i];

	// Step 4: Create friendships
	console.log('\nCreating friendships...');

	const friendshipPairs = [
		// alice's friends
		{ user: 0, friend: 1, status: 'accepted' as const },  // alice <-> bob
		{ user: 0, friend: 2, status: 'accepted' as const },  // alice <-> charlie
		{ user: 0, friend: 3, status: 'accepted' as const },  // alice <-> diana
		{ user: 0, friend: 4, status: 'accepted' as const },  // alice <-> eve

		// bob's friends
		{ user: 1, friend: 2, status: 'accepted' as const },  // bob <-> charlie
		{ user: 1, friend: 4, status: 'accepted' as const },  // bob <-> eve

		// charlie's friends
		{ user: 2, friend: 3, status: 'accepted' as const },  // charlie <-> diana

		// pending requests
		{ user: 3, friend: 5, status: 'pending' as const },   // diana -> frank (pending)
		{ user: 6, friend: 0, status: 'pending' as const },   // grace -> alice (pending)
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

	// Step 5: Create finished games with stats
	console.log('\nCreating match history...');

	const now = new Date();
	const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

	const gamesData = [
		// alice vs bob (alice wins)
		{ p1: 0, p2: 1, s1: 5, s2: 3, mode: 'remote', speed: 'normal', wscore: 5, dur: 180, date: daysAgo(7) },
		// alice vs charlie (charlie wins)
		{ p1: 0, p2: 2, s1: 4, s2: 5, mode: 'remote', speed: 'fast', wscore: 5, dur: 150, date: daysAgo(6) },
		// bob vs charlie (bob wins)
		{ p1: 1, p2: 2, s1: 7, s2: 5, mode: 'remote', speed: 'normal', wscore: 7, dur: 240, date: daysAgo(5) },
		// diana vs eve (diana wins)
		{ p1: 3, p2: 4, s1: 5, s2: 2, mode: 'remote', speed: 'chill', wscore: 5, dur: 200, date: daysAgo(5) },
		// alice vs diana (alice wins)
		{ p1: 0, p2: 3, s1: 5, s2: 1, mode: 'remote', speed: 'normal', wscore: 5, dur: 120, date: daysAgo(4) },
		// bob vs eve (eve wins)
		{ p1: 1, p2: 4, s1: 3, s2: 5, mode: 'remote', speed: 'normal', wscore: 5, dur: 160, date: daysAgo(3) },
		// charlie vs diana (charlie wins)
		{ p1: 2, p2: 3, s1: 11, s2: 9, mode: 'remote', speed: 'fast', wscore: 11, dur: 420, date: daysAgo(2) },
		// alice vs eve (alice wins)
		{ p1: 0, p2: 4, s1: 5, s2: 4, mode: 'remote', speed: 'normal', wscore: 5, dur: 190, date: daysAgo(1) },
		// bob vs diana (bob wins)
		{ p1: 1, p2: 3, s1: 5, s2: 0, mode: 'remote', speed: 'fast', wscore: 5, dur: 90, date: daysAgo(1) },
		// alice vs bob rematch (bob wins)
		{ p1: 0, p2: 1, s1: 3, s2: 5, mode: 'remote', speed: 'normal', wscore: 5, dur: 175, date: daysAgo(0) },
	];

	// Track wins/losses per user
	const stats: Record<number, { wins: number; losses: number; played: number }> = {};
	for (const cu of createdUsers) {
		stats[cu.id] = { wins: 0, losses: 0, played: 0 };
	}

	for (const game of gamesData) {
		const p1Id = u(game.p1).id;
		const p2Id = u(game.p2).id;
		const winnerId = game.s1 > game.s2 ? p1Id : p2Id;
		const loserId = winnerId === p1Id ? p2Id : p1Id;
		const winnerName = winnerId === p1Id ? u(game.p1).username : u(game.p2).username;

		await db.insert(games).values({
			type: 'pong',
			status: 'finished',
			game_mode: game.mode,
			player1_id: p1Id,
			player2_id: p2Id,
			player2_name: u(game.p2).username,
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

		stats[winnerId].wins++;
		stats[loserId].losses++;
		stats[p1Id].played++;
		stats[p2Id].played++;

		console.log(`  ${u(game.p1).username} ${game.s1}-${game.s2} ${u(game.p2).username}  (winner: ${winnerName})`);
	}

	// Step 6: Update user stats to match games
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

	// Step 7: Seed achievement definitions + user achievements
	console.log('\nSeeding achievement definitions...');

	const achievementDefs = [
		{ id: 'shutout_bronze', name: 'Shutout', tier: 'bronze', category: 'shutout', icon: '🛡️', description: 'Win a match where your opponent scores 0 points' },
		{ id: 'shutout_silver', name: 'Shutout Artist', tier: 'silver', category: 'shutout', icon: '🛡️', description: 'Win 10 shutout matches' },
		{ id: 'streak_bronze', name: 'Hot Streak', tier: 'bronze', category: 'streak', icon: '🔥', description: 'Win 3 matches in a row' },
		{ id: 'streak_silver', name: 'On Fire', tier: 'silver', category: 'streak', icon: '🔥', description: 'Win 7 matches in a row' },
		{ id: 'points_bronze', name: 'Point Collector', tier: 'bronze', category: 'scorer', icon: '🎯', description: 'Score 50 career points' },
		{ id: 'first_match', name: 'First Match', tier: 'bronze', category: 'origins', icon: '🎮', description: 'Finish one match' },
		{ id: 'first_victory', name: 'First Victory', tier: 'bronze', category: 'origins', icon: '🥇', description: 'Win your first match' },
		{ id: 'first_defeat', name: 'First Defeat', tier: 'bronze', category: 'origins', icon: '💔', description: 'Lose your first match' },
		{ id: 'profile_avatar', name: 'Face of the Game', tier: 'bronze', category: 'onboarding', icon: '🖼️', description: 'Upload or select an avatar' },
		{ id: 'profile_bio', name: 'Express Yourself', tier: 'bronze', category: 'onboarding', icon: '✍️', description: 'Write a bio' },
		{ id: 'social_first_friend', name: 'First Friend', tier: 'bronze', category: 'social', icon: '🤝', description: 'Add your first friend' },
		{ id: 'social_circle', name: 'Social Circle', tier: 'silver', category: 'social', icon: '👥', description: 'Have 5 accepted friends' },
		{ id: 'pvp_first_match', name: 'First PvP Match', tier: 'bronze', category: 'origins', icon: '🥊', description: 'Play your first online match' },
		{ id: 'pvp_first_win', name: 'First PvP Win', tier: 'bronze', category: 'origins', icon: '🏅', description: 'Win your first online match' },
		{ id: 'night_owl', name: 'Night Owl', tier: 'bronze', category: 'secret', icon: '🕒', description: 'Play a match after midnight' },
	];

	await db.delete(achievement_definitions).execute().catch(() => {});

	await db.insert(achievement_definitions).values(achievementDefs);
	console.log(`  ${achievementDefs.length} definitions seeded`);

	// Step 8: Assign achievements to users
	console.log('\nAssigning achievements to users...');

	const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);

	const userAchievements = [
		// alice — experienced player
		{ user: 0, achievement: 'first_match',        time: daysAgo(7) },
		{ user: 0, achievement: 'first_victory',      time: daysAgo(7) },
		{ user: 0, achievement: 'pvp_first_match',    time: daysAgo(7) },
		{ user: 0, achievement: 'pvp_first_win',      time: daysAgo(7) },
		{ user: 0, achievement: 'points_bronze',      time: daysAgo(4) },
		{ user: 0, achievement: 'streak_bronze',      time: daysAgo(2) },
		{ user: 0, achievement: 'social_first_friend', time: daysAgo(6) },
		{ user: 0, achievement: 'social_circle',      time: daysAgo(3) },
		{ user: 0, achievement: 'profile_bio',        time: daysAgo(7) },
		{ user: 0, achievement: 'shutout_bronze',     time: hoursAgo(12) },

		// bob — solid player
		{ user: 1, achievement: 'first_match',        time: daysAgo(7) },
		{ user: 1, achievement: 'first_victory',      time: daysAgo(5) },
		{ user: 1, achievement: 'pvp_first_match',    time: daysAgo(7) },
		{ user: 1, achievement: 'pvp_first_win',      time: daysAgo(5) },
		{ user: 1, achievement: 'shutout_bronze',     time: daysAgo(1) },
		{ user: 1, achievement: 'points_bronze',      time: hoursAgo(6) },
		{ user: 1, achievement: 'social_first_friend', time: daysAgo(6) },

		// charlie — competitive
		{ user: 2, achievement: 'first_match',        time: daysAgo(6) },
		{ user: 2, achievement: 'first_victory',      time: daysAgo(6) },
		{ user: 2, achievement: 'streak_bronze',      time: daysAgo(2) },
		{ user: 2, achievement: 'pvp_first_match',    time: daysAgo(6) },
		{ user: 2, achievement: 'pvp_first_win',      time: daysAgo(6) },
		{ user: 2, achievement: 'night_owl',          time: hoursAgo(3) },

		// diana — casual
		{ user: 3, achievement: 'first_match',        time: daysAgo(5) },
		{ user: 3, achievement: 'first_victory',      time: daysAgo(5) },
		{ user: 3, achievement: 'first_defeat',       time: daysAgo(2) },
		{ user: 3, achievement: 'profile_avatar',     time: daysAgo(4) },
		{ user: 3, achievement: 'profile_bio',        time: daysAgo(4) },

		// eve — the comeback queen
		{ user: 4, achievement: 'first_match',        time: daysAgo(5) },
		{ user: 4, achievement: 'first_victory',      time: daysAgo(3) },
		{ user: 4, achievement: 'first_defeat',       time: daysAgo(5) },
		{ user: 4, achievement: 'pvp_first_match',    time: daysAgo(5) },
		{ user: 4, achievement: 'pvp_first_win',      time: daysAgo(3) },
	];

	for (const ua of userAchievements) {
		await db.insert(achievements).values({
			user_id: u(ua.user).id,
			achievement_id: ua.achievement,
			unlocked_at: ua.time,
		});
		console.log(`  ${u(ua.user).username} -> ${ua.achievement}`);
	}

	// Summary
	console.log('\n--- SEED COMPLETE ---');
	console.log(`  Users:        ${createdUsers.length}`);
	console.log(`  Friendships:  ${friendshipPairs.length}`);
	console.log(`  Games:        ${gamesData.length}`);
	console.log(`  Achievements: ${userAchievements.length}`);
	console.log(`\n  All passwords: ${SHARED_PASSWORD}`);
	console.log('  Usernames: alice, bob, charlie, diana, eve, frank, grace, henry, Test, Tatty\n');
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
