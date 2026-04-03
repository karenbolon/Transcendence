import { pgTable, serial, integer, text, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { tournaments } from './tournaments';
import { users } from './users';

export const tournamentMessages = pgTable('tournament_messages', {
	id: serial('id').primaryKey(),
	tournament_id: integer('tournament_id')
		.notNull()
		.references(() => tournaments.id, { onDelete: 'cascade' }),
	user_id: integer('user_id')
		.notNull()
		.references(() => users.id),
	content: text('content').notNull(),
	type: varchar('type', { length: 20 }).notNull().default('chat'),
	// 'chat' | 'system'
	created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
	tournamentIdx: index('tm_tournament_idx').on(t.tournament_id),
}));