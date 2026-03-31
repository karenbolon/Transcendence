ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "xp_earned" integer DEFAULT 0 NOT NULL;
