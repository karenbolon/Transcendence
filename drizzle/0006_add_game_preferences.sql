ALTER TABLE "users" ADD COLUMN "game_preferences" jsonb DEFAULT '{"speedPreset":"normal","winScore":5}'::jsonb;
