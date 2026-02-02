// ══════════════════════════════════════════════════════════════════════════════
// 🧪 Vitest Global Setup
// ══════════════════════════════════════════════════════════════════════════════
// This file runs ONCE before all tests.
// It ensures the test database is clean before tests start.
// ══════════════════════════════════════════════════════════════════════════════

import { beforeAll, afterAll } from 'vitest';
import { db } from '../index';
import { users, games, friendships, sessions, messages, tournaments, analytics } from '../schema';
import { sql } from 'drizzle-orm';

/**
 * Clean all tables in the correct order (respecting foreign keys)
 */
async function cleanDatabase() {
	console.log('🧹 Cleaning test database...');

	// Delete in reverse dependency order
	// Analytics → Messages → Sessions → Friendships → Games → Tournaments → Users
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
		await db.delete(sessions).execute();
	} catch (e) {
		// Table might not exist yet, that's fine
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
		await db.delete(tournaments).execute();
	} catch (e) {
		// Table might not exist yet
	}

	try {
		await db.delete(users).execute();
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
});

// ══════════════════════════════════════════════════════════════════════════════
// Run cleanup AFTER all tests finish
// ══════════════════════════════════════════════════════════════════════════════
afterAll(async () => {
	await cleanDatabase();

	console.log('\n🧪 ══════════════════════════════════════════════════════════');
	console.log('   TEST SUITE COMPLETE');
	console.log('══════════════════════════════════════════════════════════\n');
});
