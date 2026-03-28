ALTER TABLE "games" ADD COLUMN "tournament_id" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "tournament_round" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "tournament_match_index" integer;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD COLUMN "xp_earned" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "speed_preset" varchar(20) DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "win_score" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "bracket_data" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "game_preferences" jsonb DEFAULT '{"speedPreset":"normal","winScore":5}'::jsonb;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "language";