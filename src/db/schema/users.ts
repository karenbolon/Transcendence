import { pgTable, serial, varchar, integer, text, timestamp, boolean, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	username: varchar('username', { length: 50 }).notNull().unique(),
	name: varchar('name', { length: 100 }).notNull(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	password_hash: varchar('password_hash', { length: 255 }).notNull(), // Required [cite: 185]
	avatar_url: varchar('avatar_url', { length: 255 }), // Required [cite: 296]
	bio: text('bio'),
	is_online: boolean('is_online').default(false),
	games_played: integer('games_played').default(0),
	wins: integer('wins').default(0),
	losses: integer('losses').default(0),
	created_at: timestamp('created_at').notNull().defaultNow(),
	updated_at: timestamp('updated_at').notNull().defaultNow(),
	is_deleted: boolean('is_deleted').default(false),
	deleted_at: timestamp('deleted_at'),
	terms_accepted_at: timestamp('terms_accepted_at'),
	// Multi-user Integrity
	version: integer('version').notNull().default(1)
}, (t) => ({
	checkWins: check('positive_wins', sql`${t.wins} >= 0`),
	checkLosses: check('positive_losses', sql`${t.losses} >= 0`),
}));