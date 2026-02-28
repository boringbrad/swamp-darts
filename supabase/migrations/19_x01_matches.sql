-- Migration 19: x01 Matches Table
-- Stores x01 match data for cross-device stats syncing
-- Mirrors the structure of cricket_matches and golf_matches

CREATE TABLE IF NOT EXISTS x01_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  match_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_x01_matches_user ON x01_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_x01_matches_match_id ON x01_matches(match_id);
CREATE INDEX IF NOT EXISTS idx_x01_matches_created ON x01_matches(created_at DESC);

-- Enable RLS
ALTER TABLE x01_matches ENABLE ROW LEVEL SECURITY;

-- Users can insert their own matches
CREATE POLICY "Users can insert x01 matches"
  ON x01_matches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own matches
CREATE POLICY "Users can read own x01 matches"
  ON x01_matches FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own matches (for upsert on retry)
CREATE POLICY "Users can update own x01 matches"
  ON x01_matches FOR UPDATE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON x01_matches TO authenticated;
