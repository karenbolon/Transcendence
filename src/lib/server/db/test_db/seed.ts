// src/lib/server/db/seed.ts
import 'dotenv/config';
import { users, games, friendships, sessions, messages, tournaments, analytics, tournamentParticipants } from '../schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// ══════════════════════════════════════════════════════════════════════════════
// 🔌 Direct database connection (bypasses SvelteKit)
// ══════════════════════════════════════════════════════════════════════════════
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL not found in environment!');
	console.error('   Make sure .env file exists with DATABASE_URL');
	process.exit(1);
}

console.log('🔌 Connecting to:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

const client = postgres(DATABASE_URL);
const db = drizzle(client);

// ══════════════════════════════════════════════════════════════════════════════
// 🌱 SEED DATA
// ══════════════════════════════════════════════════════════════════════════════

async function seed() {
	console.log('\n🌱 ══════════════════════════════════════════════════════════');
	console.log('   SEEDING DATABASE');
	console.log('══════════════════════════════════════════════════════════\n');

	// ════════════════════════════════════════════════════════════════════════
	// 🧹 Step 1: Clean existing data
	// ════════════════════════════════════════════════════════════════════════
	console.log('🧹 Cleaning existing data...');

	await db.delete(analytics).execute().catch(() => {});
	await db.delete(messages).execute().catch(() => {});
	await db.delete(sessions).execute().catch(() => {});
	await db.delete(friendships).execute();
	await db.delete(games).execute();
	await db.delete(tournamentParticipants).execute();
	await db.delete(tournaments).execute();
	await db.delete(users).execute();

	console.log('   ✅ Database cleaned\n');

	// ════════════════════════════════════════════════════════════════════════
	// 👤 Step 2: Create Users
	// ════════════════════════════════════════════════════════════════════════
	console.log('👤 Creating users...');

	const usersData = [
		{ username: 'alice', name: 'Alice Anderson', email: 'alice@pong.local' },
		{ username: 'bob', name: 'Bob Builder', email: 'bob@pong.local' },
		{ username: 'charlie', name: 'Charlie Chen', email: 'charlie@pong.local' },
		{ username: 'diana', name: 'Diana Davis', email: 'diana@pong.local' },
		{ username: 'eve', name: 'Eve Edwards', email: 'eve@pong.local' },
		{ username: 'frank', name: 'Frank Fisher', email: 'frank@pong.local' },
		{ username: 'grace', name: 'Grace Garcia', email: 'grace@pong.local' },
		{ username: 'henry', name: 'Henry Hill', email: 'henry@pong.local' },
		{ username: 'irene', name: 'Irene Ivy', email: 'irene@pong.local' },
		{ username: 'jack', name: 'Jack Johnson', email: 'jack@pong.local' }
	];

	const createdUsers: { id: number; username: string }[] = [];

	for (const userData of usersData) {
		const [user] = await db
			.insert(users)
			.values({
				...userData,
				password_hash: `hashed_password_for_${userData.username}`,
				is_online: Math.random() > 0.5,
				terms_accepted_at: new Date()
			})
			.returning({ id: users.id, username: users.username });

		createdUsers.push(user);
		console.log(`   ✅ ${user.username} (ID: ${user.id})`);
	}

	// ════════════════════════════════════════════════════════════════════════
	// 🤝 Step 3: Create Friendships
	// ════════════════════════════════════════════════════════════════════════
	console.log('\n🤝 Creating friendships...');

	const friendshipPairs = [
		// Alice's friends
		{ user: 0, friend: 1, status: 'accepted' as const },
		{ user: 0, friend: 2, status: 'accepted' as const },
		{ user: 0, friend: 3, status: 'pending' as const },

		// Bob's friends
		{ user: 1, friend: 2, status: 'accepted' as const },
		{ user: 1, friend: 4, status: 'accepted' as const },

		// Charlie's friends
		{ user: 2, friend: 3, status: 'accepted' as const },
		{ user: 2, friend: 5, status: 'rejected' as const },

		// Diana's friends
		{ user: 3, friend: 4, status: 'accepted' as const },

		// Pending requests
		{ user: 4, friend: 5, status: 'pending' as const },
		{ user: 5, friend: 6, status: 'pending' as const }
	];

	for (const pair of friendshipPairs) {
		await db.insert(friendships).values({
			user_id: createdUsers[pair.user].id,
			friend_id: createdUsers[pair.friend].id,
			status: pair.status
		});

		const statusEmoji =
			pair.status === 'accepted' ? '✅' : pair.status === 'pending' ? '⏳' : '🚫';
		console.log(
			`   ${statusEmoji} ${createdUsers[pair.user].username} → ${createdUsers[pair.friend].username} (${pair.status})`
		);
	}

	// ════════════════════════════════════════════════════════════════════════
	// 🎮 Step 4: Create Games
	// ════════════════════════════════════════════════════════════════════════
	console.log('\n🎮 Creating games...');

	// Note: status must be 'waiting', 'active', or 'finished' (not 'completed'!)
	const gamesData = [
		// Finished games
		{ p1: 0, p2: 1, s1: 11, s2: 7, status: 'finished' as const },
		{ p1: 0, p2: 2, s1: 11, s2: 9, status: 'finished' as const },
		{ p1: 1, p2: 2, s1: 8, s2: 11, status: 'finished' as const },
		{ p1: 2, p2: 3, s1: 11, s2: 5, status: 'finished' as const },
		{ p1: 3, p2: 4, s1: 6, s2: 11, status: 'finished' as const },
		{ p1: 0, p2: 4, s1: 11, s2: 3, status: 'finished' as const },
		{ p1: 1, p2: 3, s1: 11, s2: 11, status: 'finished' as const }, // tie!

		// In progress games
		{ p1: 0, p2: 5, s1: 5, s2: 3, status: 'active' as const },
		{ p1: 2, p2: 4, s1: 7, s2: 8, status: 'active' as const },

		// Waiting games
		{ p1: 4, p2: 6, s1: 0, s2: 0, status: 'waiting' as const },
		{ p1: 5, p2: 7, s1: 0, s2: 0, status: 'waiting' as const }
	];

	for (const game of gamesData) {
		const winnerId =
			game.status === 'finished' && game.s1 !== game.s2
				? game.s1 > game.s2
					? createdUsers[game.p1].id
					: createdUsers[game.p2].id
				: null;

		const winnerName = winnerId
			? game.s1 > game.s2
				? createdUsers[game.p1].username
				: createdUsers[game.p2].username
			: '';

		await db.insert(games).values({
			type: 'pong',
			player1_id: createdUsers[game.p1].id,
			player2_id: createdUsers[game.p2].id,
			player1_score: game.s1,
			player2_score: game.s2,
			status: game.status,
			winner_id: winnerId,
			winner_name: winnerName
		});

		const p1Name = createdUsers[game.p1].username;
		const p2Name = createdUsers[game.p2].username;
		const statusEmoji =
			game.status === 'finished' ? '🏆' : game.status === 'active' ? '🎮' : '⏳';
		const winnerLabel = winnerId
			? game.s1 > game.s2
				? p1Name
				: p2Name
			: game.status === 'finished'
				? 'TIE'
				: '-';

		console.log(`   ${statusEmoji} ${p1Name} vs ${p2Name}: ${game.s1}-${game.s2} (${winnerLabel})`);
	}

	// ════════════════════════════════════════════════════════════════════════
	// 🏆 Step 5: Create Tournaments (NEW — Junction Table Pattern)
	// ════════════════════════════════════════════════════════════════════════
	console.log('\n🏆 Creating tournaments...');

	// Tournament 1: Finished 4-player tournament
	const [tournament1] = await db
		.insert(tournaments)
		.values({
			name: 'Spring Cup 2025',
			description: 'First official Pong tournament!',
			game_type: 'pong',
			status: 'finished',
			max_players: 4,
			current_round: 2,
			created_by: createdUsers[0].id,
			winner_id: createdUsers[0].id,
			started_at: new Date('2025-03-01'),
			finished_at: new Date('2025-03-02')
		})
		.returning();

	// Add participants with final placements
	const t1Participants = [
		{ userId: 0, seed: 1, placement: 1, status: 'champion' },
		{ userId: 1, seed: 2, placement: 2, status: 'eliminated' },
		{ userId: 2, seed: 3, placement: 3, status: 'eliminated' },
		{ userId: 3, seed: 4, placement: 3, status: 'eliminated' }
	];

	for (const p of t1Participants) {
		await db.insert(tournamentParticipants).values({
			tournament_id: tournament1.id,
			user_id: createdUsers[p.userId].id,
			seed: p.seed,
			placement: p.placement,
			status: p.status
		});
	}
	console.log(`   🏆 ${tournament1.name} (finished, winner: alice)`);

	// Tournament 2: In-progress 8-player tournament
	const [tournament2] = await db
		.insert(tournaments)
		.values({
			name: 'Summer Showdown',
			description: '8-player bracket — may the best player win!',
			game_type: 'pong',
			status: 'in_progress',
			max_players: 8,
			current_round: 1,
			created_by: createdUsers[1].id,
			started_at: new Date()
		})
		.returning();

	// Add 8 participants (all active, no placements yet)
	for (let i = 0; i < 8; i++) {
		await db.insert(tournamentParticipants).values({
			tournament_id: tournament2.id,
			user_id: createdUsers[i].id,
			seed: i + 1,
			status: 'active'
		});
	}
	console.log(`   🎮 ${tournament2.name} (in_progress, 8 players)`);

	// Tournament 3: Open registration
	const [tournament3] = await db
		.insert(tournaments)
		.values({
			name: 'Weekend Warriors',
			description: 'Casual tournament — all skill levels welcome!',
			game_type: 'pong',
			status: 'registration',
			max_players: 4,
			current_round: 0,
			created_by: createdUsers[4].id
		})
		.returning();

	// Only 2 registered so far
	await db.insert(tournamentParticipants).values({
		tournament_id: tournament3.id,
		user_id: createdUsers[4].id,
		seed: null,
		status: 'registered'
	});
	await db.insert(tournamentParticipants).values({
		tournament_id: tournament3.id,
		user_id: createdUsers[5].id,
		seed: null,
		status: 'registered'
	});
	console.log(`   ⏳ ${tournament3.name} (registration, 2/4 players)`);

	// ════════════════════════════════════════════════════════════════════════
	// 📊 Step 6: Summary
	// ════════════════════════════════════════════════════════════════════════
	const finalUsers = 		 await db.select().from(users);
	const finalGames = 		 await db.select().from(games);
	const finalFriendships = await db.select().from(friendships);
	const finalTournaments = 	 await db.select().from(tournaments);
	const finalParticipants = 	 await db.select().from(tournamentParticipants);

	console.log('\n📊 ══════════════════════════════════════════════════════════');
	console.log('   SEED COMPLETE');
	console.log('══════════════════════════════════════════════════════════');
	console.log(`   👤 Users:       ${finalUsers.length}`);
	console.log(`   🎮 Games:       ${finalGames.length}`);
	console.log(`   🤝 Friendships: ${finalFriendships.length}`);
	console.log(`   🏆 Tournaments:              ${finalTournaments.length}`);
	console.log(`   👥 Tournament Participants:   ${finalParticipants.length}`);
	console.log('══════════════════════════════════════════════════════════\n');
}

// ══════════════════════════════════════════════════════════════════════════════
// 🚀 RUN SEED
// ══════════════════════════════════════════════════════════════════════════════
seed()
	.then(() => {
		console.log('✅ Seeding completed successfully!\n');
		process.exit(0);
	})
	.catch((error) => {
		console.error('❌ Seeding failed:', error);
		process.exit(1);
	})
	.finally(() => {
		client.end();
	});
