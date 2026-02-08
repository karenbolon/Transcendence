import { pgTable, serial, integer, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users';

export const friendships = pgTable('friendships', {
	id: serial('id').primaryKey(),
	user_id: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	friend_id: integer('friend_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	status: varchar('status', { length: 20 }).notNull().default('pending'),
	created_at: timestamp('created_at').notNull().defaultNow(),
	version: integer('version').notNull().default(1)
}, (t) => ({
	// Prevents duplicate friendship rows
	uniquePair: unique().on(t.user_id, t.friend_id),
}));