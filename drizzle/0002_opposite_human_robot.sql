CREATE TABLE IF NOT EXISTS "player_progression" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"current_level" integer DEFAULT 0 NOT NULL,
	"current_xp" integer DEFAULT 0 NOT NULL,
	"total_game_xp" integer DEFAULT 0 NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"xp_to_next_level" integer DEFAULT 50 NOT NULL,
	"current_win_streak" integer DEFAULT 0 NOT NULL,
	"best_win_streak" integer DEFAULT 0 NOT NULL,
	"total_points_scored" integer DEFAULT 0 NOT NULL,
	"total_ball_returns" integer DEFAULT 0 NOT NULL,
	"shutout_wins" integer DEFAULT 0 NOT NULL,
	"comeback_wins" integer DEFAULT 0 NOT NULL,
	"consecutive_days_played" integer DEFAULT 0 NOT NULL,
	"last_played_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "player-progression" DISABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;--> statement-breakpoint
DROP TABLE IF EXISTS "player-progression" CASCADE;--> statement-breakpoint
ALTER TABLE "achievement_definitions" ALTER COLUMN "category" SET DEFAULT 'origins';--> statement-breakpoint
ALTER TABLE "achievement_definitions" ADD COLUMN IF NOT EXISTS "icon" varchar(10) DEFAULT '🏆' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "player_progression" ADD CONSTRAINT "player_progression_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;