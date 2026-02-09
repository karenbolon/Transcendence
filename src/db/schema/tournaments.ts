import { pgTable, serial, varchar, integer, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
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
	max_players: integer('max_players').notNull().default(4),
	current_round: integer('current_round').default(0),
	started_at: timestamp('started_at'),
	finished_at: timestamp('finished_at'),
	created_at: timestamp('created_at').notNull().defaultNow(),
	updated_at: timestamp('updated_at').notNull().defaultNow(),
	version: integer('version').notNull().default(1)
}, (t) => ({
	tourneyStatusIndex: index('tourney_status_idx').on(t.status),
}));

export const tournamentParticipants = pgTable('tournament_participants', {
	id: serial('id').primaryKey(),
	tournament_id: integer('tournament_id')
		.notNull()
		.references(() => tournaments.id, { onDelete: 'cascade' }),
	user_id: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	seed: integer('seed'),
	placement: integer('placement'),
	status: varchar('status', { length: 20 }).notNull().default('registered'), // registered, eliminated, winner
	joined_at: timestamp('joined_at').notNull().defaultNow(),
}, (t) => ({
	// Prevent duplicate registrations
	uniqueParticipant: unique().on(t.tournament_id, t.user_id),
	tournamentIndex: index('tp_tournament_idx').on(t.tournament_id),
	userIndex: index('tp_user_idx').on(t.user_id),
}));