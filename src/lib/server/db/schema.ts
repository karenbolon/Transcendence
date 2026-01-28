import { pgTable, serial, varchar, integer, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users Table
export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	username: varchar('username', { length: 50 }).notNull().unique(),
	name: varchar('name', { length: 100 }).notNull(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	password_hash: varchar('password_hash', { length: 255 }).notNull(),
	avatar_url: varchar('avatar_url', { length: 255 }),
	bio: text('bio'),
	is_online: boolean('is_online').default(false),
	games_played: integer('games_played').default(0),
	wins: integer('wins').default(0),
	losses: integer('losses').default(0),
	// friend_count: integer('friend_count').default(0),
	created_at: timestamp('created_at').notNull().defaultNow(),
	updated_at: timestamp('updated_at').notNull().defaultNow()
});

// Session table
export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
	//createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// GAMES TABLE
export const games = pgTable('games', {
	id: serial('id').primaryKey(),
	type: varchar('type', { length: 50 }).notNull(), // 'pong', 'chess', etc.
	status: varchar('status', { length: 20 }).notNull().default('waiting'), // 'waiting', 'active', 'finished'
	player1_id: integer('player1_id')
		.notNull()
		.references(() => users.id, { onDelete: 'restrict' }),
	player2_id: integer('player2_id')
		.references(() => users.id, { onDelete: 'restrict' }),
	player1_score: integer('player1_score').default(0),
	player2_score: integer('player2_score').default(0),
	winner_id: integer('winner_id')
		.references(() => users.id, { onDelete: 'restrict' }),
	started_at: timestamp('started_at'),
	finished_at: timestamp('finished_at'),
	created_at: timestamp('created_at').notNull().defaultNow(),
	updated_at: timestamp('updated_at').notNull().defaultNow()
});

// FRIENDSHIPS TABLE (Many-to-Many)
export const friendships = pgTable('friendships', {
	id: serial('id').primaryKey(),
	user_id: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	friend_id: integer('friend_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'accepted', 'rejected'
	created_at: timestamp('created_at').notNull().defaultNow()
});

// DEFINE RELATIONS (for easier querying)
export const usersRelations = relations(users, ({ many }) => ({
	gamesAsPlayer1: many(games, { relationName: 'player1' }),
	gamesAsPlayer2: many(games, { relationName: 'player2' }),
	friendships: many(friendships),
	gamesWon: many(games, { relationName: 'winner' }),
	sentFriendRequests: many(friendships, { relationName: 'sentRequests' }),
	receivedFriendRequests: many(friendships, { relationName: 'receivedRequests' })
}));

export const gamesRelations = relations(games, ({ one }) => ({
	player1: one(users, {
		fields: [games.player1_id],
		references: [users.id],
		relationName: 'player1'
	}),
	player2: one(users, {
		fields: [games.player2_id],
		references: [users.id],
		relationName: 'player2'
	}),
	winner: one(users, {
		fields: [games.winner_id],
		references: [users.id],
		relationName: 'winner'
	})
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
