import { pgTable, serial, varchar, integer, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const tournaments = pgTable('tournaments', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    game_type: varchar('game_type', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('scheduled'),
    created_by: integer('created_by')
        .notNull()
        .references(() => users.id, { onDelete: 'restrict' }),
    winner_id: integer('winner_id').references(() => users.id, { onDelete: 'set null' }),
    started_at: timestamp('started_at'),
    finished_at: timestamp('finished_at'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
    max_players: integer('max_players').notNull().default(4),
    player_1_id: integer('player_1_id').notNull().references(() => users.id),
    player_2_id: integer('player_2_id').references(() => users.id),
    player_3_id: integer('player_3_id').references(() => users.id),
    player_4_id: integer('player_4_id').references(() => users.id),
    version: integer('version').notNull().default(1)
}, (t) => ({
    tourneyStatusIndex: index('tourney_status_idx').on(t.status),
}));