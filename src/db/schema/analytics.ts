import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { games } from './games';
import { tournaments } from './tournaments';

// Analytics Table
export const analytics = pgTable('analytics', {
	id: serial('id').primaryKey(),
	user_id: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
	game_id: integer('game_id').references(() => games.id, { onDelete: 'cascade' }),
	tournament_id: integer('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }),
	event_type: varchar('event_type', { length: 50 }).notNull(),
	metadata: text('metadata'),
	created_at: timestamp('created_at').notNull().defaultNow()
});