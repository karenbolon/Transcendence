import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { dbLogger } from '$lib/server/logger';

type Db = ReturnType<typeof drizzle<typeof schema>>;

let _db: Db | undefined;

export function getDb(): Db {
	if (!_db) {
		const connectionString = env.DB_URL || env.DATABASE_URL;
		if (!connectionString) throw new Error('DATABASE_URL is not set');
		const client = postgres(connectionString, { prepare: false });
		_db = drizzle(client, {
			schema,
			logger: {
				logQuery(query, params) {
					dbLogger.debug({ query, params }, 'query');
				}
			}
		});
	}
	return _db;
}

// Proxy preserves backward compat: `import { db }` works unchanged everywhere.
// Properties are forwarded to the lazily-initialized instance on first access.
export const db: Db = new Proxy({} as Db, {
	get: (_target, prop, receiver) => {
		const instance = getDb();
		const value = Reflect.get(instance, prop, receiver);
		return typeof value === 'function' ? value.bind(instance) : value;
	}
});
