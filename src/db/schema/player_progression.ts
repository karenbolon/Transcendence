import { pgTable, serial, varchar, integer, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const player_progression = pgTable('player-progression', {
    user_id: integer('user_id').references(() => users.id, { onDelete: 'restrict' }),
    current_level: integer('current_level').default(0),
    current_game_xp: integer('current_xp').default(0),
    total_game_xp: integer('total_xp').default(0),
    total_xp: integer('total_xp').default(0),
    xp_to_next_level: integer('xp_to_next_level').default(50),
    current_win_streak: integer('current_win_streak').default(0),
    best_win_streak: integer('best_win_streak').default(0),
    // Achievement tracking fields
    total_points_scored: integer('total_points_scored').default(0),
    total_ball_returns: integer('total_ball_returns').default(0),
    shutout_wins: integer('shutout_wins').default(0),
    comeback_wins: integer('comeback_wins').default(0),
    consecutive_days_played: integer('consecutive_days_played').default(0)
});
