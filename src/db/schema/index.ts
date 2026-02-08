import { relations } from 'drizzle-orm';
import { users } from './users';
import { games } from './games';
import { messages } from './messages';
import { tournaments, tournamentParticipants } from './tournaments';
import { analytics } from './analytics';
import { sessions } from './sessions';
import { friendships } from './friendships';

export { users, games, messages, tournaments, analytics, sessions, friendships, tournamentParticipants };

export const usersRelations = relations(users, ({ many }) => ({
	gamesAsPlayer1: many(games, { relationName: 'player1' }),
	gamesAsPlayer2: many(games, { relationName: 'player2' }),
	gamesWon: many(games, { relationName: 'winner' }),
	sentFriendRequests: many(friendships, { relationName: 'sentRequests' }),
	receivedFriendRequests: many(friendships, { relationName: 'receivedRequests' }),
	sentMessages: many(messages, { relationName: 'sentMessages' }),
	receivedMessages: many(messages, { relationName: 'receivedMessages' }),
	tournamentsCreated: many(tournaments, { relationName: 'createdTournaments' }),
	tournamentEntries: many(tournamentParticipants, { relationName: 'userTournaments' }),
	tournamentsWon: many(tournaments, { relationName: 'wonTournaments' }),
	analyticsEvents: many(analytics, { relationName: 'userAnalytics' })
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
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
	}),
	messages: many(messages, { relationName: 'gameMessages' }),
	analyticsEvents: many(analytics, { relationName: 'gameAnalytics' })
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
	user: one(users, {
		fields: [friendships.user_id],
		references: [users.id],
		relationName: 'sentRequests'
	}),
	friend: one(users, {
		fields: [friendships.friend_id],
		references: [users.id],
		relationName: 'receivedRequests'
	})
}));

export const messagesRelations = relations(messages, ({ one }) => ({
	sender: one(users, {
		fields: [messages.sender_id],
		references: [users.id],
		relationName: 'sentMessages'
	}),
	recipient: one(users, {
		fields: [messages.recipient_id],
		references: [users.id],
		relationName: 'receivedMessages'
	}),
	game: one(games, {
		fields: [messages.game_id],
		references: [games.id],
		relationName: 'gameMessages'
	})
}));

// Add relations for tournamentParticipants
export const tournamentParticipantsRelations = relations(tournamentParticipants, ({ one }) => ({
	tournament: one(tournaments, {
		fields: [tournamentParticipants.tournament_id],
		references: [tournaments.id],
		relationName: 'tournamentEntries'
	}),
	user: one(users, {
		fields: [tournamentParticipants.user_id],
		references: [users.id],
		relationName: 'userTournaments'
	}),
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
	creator: one(users, {
		fields: [tournaments.created_by],
		references: [users.id],
		relationName: 'createdTournaments'
	}),
	winner: one(users, {
		fields: [tournaments.winner_id],
		references: [users.id],
		relationName: 'wonTournaments'
	}),
	participants: many(tournamentParticipants, { relationName: 'tournamentEntries' }),
	analyticsEvents: many(analytics, { relationName: 'tournamentAnalytics' })
}));

export const analyticsRelations = relations(analytics, ({ one }) => ({
	user: one(users, {
		fields: [analytics.user_id],
		references: [users.id],
		relationName: 'userAnalytics'
	}),
	game: one(games, {
		fields: [analytics.game_id],
		references: [games.id],
		relationName: 'gameAnalytics'
	}),
	tournament: one(tournaments, {
		fields: [analytics.tournament_id],
		references: [tournaments.id],
		relationName: 'tournamentAnalytics'
	})
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Tournament = typeof tournaments.$inferSelect;
export type NewTournament = typeof tournaments.$inferInsert;

export type Analytics = typeof analytics.$inferSelect;
export type NewAnalytics = typeof analytics.$inferInsert;

export type TournamentParticipant = typeof tournamentParticipants.$inferSelect;
export type NewTournamentParticipant = typeof tournamentParticipants.$inferInsert;
