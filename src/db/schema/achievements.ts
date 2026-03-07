import { pgTable, serial, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { achievement_definitions } from './achievement_definitions';

export const achievements = pgTable('achievements', {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').references(() => users.id, { onDelete: 'restrict' }),
    achievement_id: varchar('achievement_id', { length: 50 }).notNull().references(() => achievement_definitions.id, { onDelete: 'restrict' }),
    unlocked_at: timestamp('unlocked_at').notNull().defaultNow()
});
