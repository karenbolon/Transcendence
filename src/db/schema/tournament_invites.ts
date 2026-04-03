import { pgTable, serial, integer, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { tournaments } from './tournaments';
import { users } from './users';

export const tournamentInvites = pgTable('tournament_invites', {
	id: serial('id').primaryKey(),
	tournament_id: integer('tournament_id')
		.notNull()
		.references(() => tournaments.id, { onDelete: 'cascade' }),
	invited_by: integer('invited_by')
		.notNull()
		.references(() => users.id),
	invited_user_id: integer('invited_user_id')
		.notNull()
		.references(() => users.id),
	status: varchar('status', { length: 20 }).notNull().default('pending'),
	// 'pending' | 'accepted' | 'declined'
	created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
	uniqueInvite: unique().on(t.tournament_id, t.invited_user_id),
}));