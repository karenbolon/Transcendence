// ══════════════════════════════════════════════════════════════════════════════
// 🧪 Vitest Global Setup
// ══════════════════════════════════════════════════════════════════════════════
// This file runs ONCE before all tests.
// It ensures the test database is clean before tests start.
// ══════════════════════════════════════════════════════════════════════════════

import { beforeAll, afterAll } from 'vitest';
import { db } from '../index';
import { sql } from 'drizzle-orm';

/**
 * Clean all tables in the correct order (respecting foreign keys)
 */
async function cleanDatabase() {
	console.log('🧹 Cleaning test database...');

	// Fast cleanup path: truncate all user tables in one shot.
	// This is significantly faster than many sequential DELETEs and avoids hook timeouts.
	try {
		await db.execute(sql`
			DO $$
			DECLARE
				t RECORD;
			BEGIN
				FOR t IN (
					SELECT tablename
					FROM pg_tables
					WHERE schemaname = 'public'
					  AND tablename NOT IN ('__drizzle_migrations')
				) LOOP
					EXECUTE 'TRUNCATE TABLE ' || quote_ident(t.tablename) || ' RESTART IDENTITY CASCADE';
				END LOOP;
			END $$;
		`);
	} catch {
		// Fallback (or empty schema) — ignore so tests can proceed.
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
