ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "tournament_id" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "tournament_round" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "tournament_match_index" integer;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "xp_earned" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "speed_preset" varchar(20) DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "win_score" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "bracket_data" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "game_preferences" jsonb DEFAULT '{"speedPreset":"normal","winScore":5}'::jsonb;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "games" ADD CONSTRAINT "games_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "language";
