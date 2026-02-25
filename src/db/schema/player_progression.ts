import { pgTable, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const player_progression = pgTable('player_progression', {
    user_id: integer('user_id').primaryKey().references(() => users.id, { onDelete: 'restrict' }),
    current_level: integer('current_level').notNull().default(0),
    current_xp: integer('current_xp').notNull().default(0),
    total_game_xp: integer('total_game_xp').notNull().default(0),
    total_xp: integer('total_xp').notNull().default(0),
    xp_to_next_level: integer('xp_to_next_level').notNull().default(50),
    current_win_streak: integer('current_win_streak').notNull().default(0),
    best_win_streak: integer('best_win_streak').notNull().default(0),
    // Achievement tracking fields
    total_points_scored: integer('total_points_scored').notNull().default(0),
    total_ball_returns: integer('total_ball_returns').notNull().default(0),
    shutout_wins: integer('shutout_wins').notNull().default(0),
    comeback_wins: integer('comeback_wins').notNull().default(0),
    consecutive_days_played: integer('consecutive_days_played').notNull().default(0),
    last_played_at: timestamp('last_played_at'),
});
