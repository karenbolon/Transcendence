import { pgTable, serial, integer, text, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { games } from './games';

export const messages = pgTable('messages', {
    id: serial('id').primaryKey(),
    sender_id: integer('sender_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    recipient_id: integer('recipient_id')
        .references(() => users.id, { onDelete: 'cascade' }),
    game_id: integer('game_id')
        .references(() => games.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 30 }).notNull().default('chat'),
    content: text('content').notNull(),
    is_read: boolean('is_read').notNull().default(false),
    created_at: timestamp('created_at').notNull().defaultNow(),
    read_at: timestamp('read_at'),
    version: integer('version').notNull().default(1)
});