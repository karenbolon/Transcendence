import { pgTable, serial, varchar, real, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const server_metrics = pgTable('server_metrics', {
	id: serial('id').primaryKey(),
	metric_name: varchar('metric_name', { length: 100 }).notNull(),
	metric_value: real('metric_value').notNull(),
	metric_type: varchar('metric_type', { length: 20 }).notNull(),
	attributes: jsonb('attributes').$type<Record<string, string>>(),
	recorded_at: timestamp('recorded_at').notNull().defaultNow(),
}, (table) => ({
	recordedAtIndex: index('sm_recorded_at_idx').on(table.recorded_at),
	metricNameIndex: index('sm_metric_name_idx').on(table.metric_name),
}));
