ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "game_preferences" jsonb DEFAULT '{"speedPreset":"normal","winScore":5}'::jsonb;
