import { pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core';

export const achievement_definitions = pgTable('achievement_definitions', {
    id: varchar('id', { length: 50 }).primaryKey(), // e.g. 'shutout_bronze'
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description').notNull(),
    tier: varchar('tier', { length: 20 }).notNull(), // bronze, silver, gold
    created_at: timestamp('created_at').notNull().defaultNow(),
});
