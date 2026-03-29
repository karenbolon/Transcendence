-- Add tournament columns to games table
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "tournament_id" integer REFERENCES "tournaments"("id") ON DELETE set null;
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "tournament_round" integer;
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "tournament_match_index" integer;

-- Add missing columns to tournaments table
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "speed_preset" varchar(20) NOT NULL DEFAULT 'normal';
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "win_score" integer NOT NULL DEFAULT 5;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "bracket_data" jsonb;
