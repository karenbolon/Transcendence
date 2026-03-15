-- Idempotent seed for achievement_definitions
-- Runs on every container start (safe due to ON CONFLICT DO UPDATE)

INSERT INTO achievement_definitions (id, name, description, tier, category, icon) VALUES
  -- Shutout (Skill)
  ('shutout_bronze', 'Shutout',        'Win a match where your opponent scores 0 points', 'bronze', 'shutout', '🛡️'),
  ('shutout_silver', 'Shutout Artist', 'Win 10 shutout matches',                          'silver', 'shutout', '🛡️'),
  ('shutout_gold',   'Perfect Machine','Win 50 shutout matches',                           'gold',   'shutout', '🛡️'),

  -- Hot Streak (Skill)
  ('streak_bronze', 'Hot Streak',  'Win 3 matches in a row',  'bronze', 'streak', '🔥'),
  ('streak_silver', 'On Fire',     'Win 7 matches in a row',  'silver', 'streak', '🔥'),
  ('streak_gold',   'Unstoppable', 'Win 15 matches in a row', 'gold',   'streak', '🔥'),

  -- Progression (Origins)
  ('level_bronze', 'Level Up!',        'Reach Level 5',  'bronze', 'origins', '🌀'),
  ('level_silver', 'Level Enthusiast', 'Reach Level 15', 'silver', 'origins', '🌀'),
  ('level_gold',   'Level Master',     'Reach Level 25', 'gold',   'origins', '🌀'),

  -- Point Collector (Scorer)
  ('points_bronze', 'Point Collector', 'Score 50 career points',   'bronze', 'scorer', '🎯'),
  ('points_silver', 'Point Machine',   'Score 250 career points',  'silver', 'scorer', '🎯'),
  ('points_gold',   'Point God',       'Score 1000 career points', 'gold',   'scorer', '🎯'),

  -- Match Engagement (Origins & Veteran)
  ('matches_10',    'Getting Started', 'Play 10 matches',  'bronze', 'origins', '🎾'),
  ('matches_50',    'Regular',         'Play 50 matches',  'silver', 'origins', '🎾'),
  ('matches_v_100', 'Veteran',         'Play 100 matches', 'bronze', 'veteran', '🎮'),
  ('matches_v_250', 'Elite Veteran',   'Play 250 matches', 'silver', 'veteran', '🎮'),
  ('matches_v_500', 'Living Legend',   'Play 500 matches', 'gold',   'veteran', '🎮'),

  -- Comeback (Skill)
  ('comeback_bronze', 'Comeback Kid',    'Win after being down by 2+ points',          'bronze', 'comeback', '💪'),
  ('comeback_silver', 'Never Give Up',   'Win 5 comeback matches (down by 2+ points)', 'silver', 'comeback', '💪'),
  ('comeback_gold',   'Miracle Worker',  'Win 20 comeback matches',                    'gold',   'comeback', '💪'),

  -- Rally (Endurance)
  ('rally_bronze', 'Rally Starter',  'Return the ball 100 times across all matches',  'bronze', 'rally', '🏓'),
  ('rally_silver', 'Rally Master',   'Return the ball 500 times across all matches',  'silver', 'rally', '🏓'),
  ('rally_gold',   'Rally Legend',   'Return the ball 2000 times across all matches', 'gold',   'rally', '🏓')

ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  tier        = EXCLUDED.tier,
  category    = EXCLUDED.category,
  icon        = EXCLUDED.icon;
