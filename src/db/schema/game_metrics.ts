import { pgTable, serial, integer, real, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { games } from './games';

export const game_metrics = pgTable('game_metrics', {
	id: serial('id').primaryKey(),
	game_id: integer('game_id').references(() => games.id, { onDelete: 'cascade' }),
	user_id: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
	avg_rtt: real('avg_rtt').notNull(),
	p95_rtt: real('p95_rtt').notNull(),
	avg_jitter: real('avg_jitter').notNull(),
	p95_jitter: real('p95_jitter').notNull(),
	avg_fps: real('avg_fps').notNull(),
	min_fps: real('min_fps').notNull(),
	browser: varchar('browser', { length: 200 }).notNull(),
	viewport_width: integer('viewport_width').notNull(),
	viewport_height: integer('viewport_height').notNull(),
	duration_seconds: integer('duration_seconds'),
	created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
	createdAtIndex: index('gm_created_at_idx').on(table.created_at),
	gameIdIndex: index('gm_game_id_idx').on(table.game_id),
}));
