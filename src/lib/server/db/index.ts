import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Db = ReturnType<typeof drizzle<typeof schema>>;

let _db: Db | undefined;

export function getDb(): Db {
	if (!_db) {
		const connectionString = process.env.DB_URL || process.env.DATABASE_URL;
		if (!connectionString) throw new Error('DATABASE_URL is not set');
		const client = postgres(connectionString, { prepare: false });
		_db = drizzle(client, { schema });
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
