import { pgTable, serial, varchar, integer, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const games = pgTable('games', {
	id: serial('id').primaryKey(),
	type: varchar('type', { length: 50 }).notNull(),
	status: varchar('status', { length: 20 }).notNull().default('waiting'),
	player1_id: integer('player1_id')
		.notNull()
		.references(() => users.id, { onDelete: 'restrict' }),
	player2_id: integer('player2_id').references(() => users.id, { onDelete: 'restrict' }),
	player1_score: integer('player1_score').default(0),
	player2_score: integer('player2_score').default(0),
	winner_id: integer('winner_id').references(() => users.id, { onDelete: 'restrict' }),
	started_at: timestamp('started_at'),
	finished_at: timestamp('finished_at'),
	created_at: timestamp('created_at').notNull().defaultNow(),
	updated_at: timestamp('updated_at').notNull().defaultNow(),
	version: integer('version').notNull().default(1)
}, (table) => ({
    // MANDATORY VALIDATION: A player cannot play against themselves 
    notSelfPlay: check('not_self_play', sql`${table.player1_id} <> ${table.player2_id}`),
    
    // VALIDATION: Ensure scores aren't negative 
    positiveScore1: check('pos_score1', sql`${table.player1_score} >= 0`),
    positiveScore2: check('pos_score2', sql`${table.player2_score} >= 0`),
    
    // PERFORMANCE: Index for matchmaking (finding 'waiting' games quickly)
    statusIndex: index('status_idx').on(table.status),
}));
