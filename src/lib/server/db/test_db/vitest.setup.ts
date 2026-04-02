// ══════════════════════════════════════════════════════════════════════════════
// 🧪 Vitest Global Setup
// ══════════════════════════════════════════════════════════════════════════════
// This file runs ONCE before all tests.
// It ensures the test database is clean before tests start.
// ══════════════════════════════════════════════════════════════════════════════

import { beforeAll, afterAll } from 'vitest';
import { db } from '../index';
import { 
	users, 
	games, 
	friendships, 
	sessions, 
	messages, 
	tournaments, 
	analytics, 
	tournamentParticipants, 
	achievements, 
	player_progression, 
	achievement_definitions,
	oauthAccounts,
	oauthStates
} from '../schema';
import { sql } from 'drizzle-orm';

/**
 * Clean all tables in the correct order (respecting foreign keys)
 */
async function cleanDatabase() {
	console.log('🧹 Cleaning test database...');

	// Delete in reverse dependency order
	// Analytics → Messages → Sessions → Achievements → Player_progression → Friendships → Games → Tournaments → Users → Achievement_definitions
	try {
		await db.delete(analytics).execute();
	} catch (e) {
		// Table might not exist yet, that's fine
	}

	try {
		await db.delete(messages).execute();
	} catch (e) {
		// Table might not exist yet, that's fine
	}

	try {
		await db.delete(oauthStates).execute();
	} catch (e) {
		// Table might not exist yet, that's fine
	}

	try {
		await db.delete(oauthAccounts).execute();
	} catch (e) {
		// Table might not exist yet, that's fine
	}

	try {
		await db.delete(sessions).execute();
	} catch (e) {
		// Table might not exist yet, that's fine
	}

	try {
		await db.delete(achievements).execute();
	} catch (e) {
		// Table might not exist yet
	}

	try {
		await db.delete(player_progression).execute();
	} catch (e) {
		// Table might not exist yet
	}

	try {
		await db.delete(friendships).execute();
	} catch (e) {
		// Table might not exist yet
	}

	try {
		await db.delete(games).execute();
	} catch (e) {
		// Table might not exist yet
	}

	try {
		await db.delete(tournamentParticipants).execute();
	} catch (e) {
		// Table might not exist yet
	}

	try {
		await db.delete(tournaments).execute();
	} catch (e) {
		// Table might not exist yet
	}

	try {
		await db.delete(users).execute();
	} catch (e) {
		// Table might not exist yet
	}

	try {
		await db.delete(achievement_definitions).execute();
	} catch (e) {
		// Table might not exist yet
	}

	// Reset auto-increment sequences so IDs start from 1
	try {
		await db.execute(sql`
			DO $$
			DECLARE
				r RECORD;
			BEGIN
				FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
					EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.sequencename) || ' RESTART WITH 1';
				END LOOP;
			END $$;
		`);
	} catch (e) {
		// Sequences might not exist yet
	}

	console.log('✅ Test database cleaned!\n');
}

// ══════════════════════════════════════════════════════════════════════════════
// Run cleanup BEFORE all tests start
// ══════════════════════════════════════════════════════════════════════════════
beforeAll(async () => {
	console.log('\n🧪 ══════════════════════════════════════════════════════════');
	console.log('   STARTING TEST SUITE');
	console.log('   Database: db_test (port 5433)');
	console.log('══════════════════════════════════════════════════════════\n');

	await cleanDatabase();
}, 30000);

// ══════════════════════════════════════════════════════════════════════════════
// Run cleanup AFTER all tests finish
// ══════════════════════════════════════════════════════════════════════════════
afterAll(async () => {
	console.log('\n🧪 ══════════════════════════════════════════════════════════');
	console.log('   TEST SUITE COMPLETE');
	console.log('══════════════════════════════════════════════════════════\n');
});
