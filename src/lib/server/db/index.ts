import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// we need prepare: false for supabase transaction mode
// Use DB_URL (Transaction Mode) if available, otherwise fall back to DATABASE_URL
const connectionString = env.DB_URL || env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
