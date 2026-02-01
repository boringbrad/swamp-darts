-- Analytics Tables for Platform Insights
-- Created: 2026-01-26
-- Purpose: Track guest players, cricket matches, and golf matches for admin analytics
-- and to enable cross-device stat syncing for users

-- ============================================================================
-- GUEST PLAYERS TABLE
-- ============================================================================
-- Tracks all guest players added by users
-- Admin can see: who adds guests, when, how frequently guests play
CREATE TABLE IF NOT EXISTS guest_players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  photo_url TEXT,
  added_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_guest_players_user ON guest_players(added_by_user_id);

-- Index for querying by creation date
CREATE INDEX IF NOT EXISTS idx_guest_players_created ON guest_players(created_at DESC);

-- RLS Policies for guest_players
ALTER TABLE guest_players ENABLE ROW LEVEL SECURITY;

-- Users can insert their own guest players
CREATE POLICY "Users can insert guest players"
  ON guest_players
  FOR INSERT
  WITH CHECK (auth.uid() = added_by_user_id);

-- Users can read their own guest players
CREATE POLICY "Users can read own guest players"
  ON guest_players
  FOR SELECT
  USING (auth.uid() = added_by_user_id);

-- Users can update their own guest players
CREATE POLICY "Users can update own guest players"
  ON guest_players
  FOR UPDATE
  USING (auth.uid() = added_by_user_id);

-- Users can delete their own guest players
CREATE POLICY "Users can delete own guest players"
  ON guest_players
  FOR DELETE
  USING (auth.uid() = added_by_user_id);

-- ============================================================================
-- CRICKET MATCHES TABLE
-- ============================================================================
-- Stores complete cricket match data for analytics and cross-device syncing
CREATE TABLE IF NOT EXISTS cricket_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_data JSONB NOT NULL,
  players JSONB NOT NULL,
  game_mode TEXT NOT NULL, -- '301', '501', '701', 'cutthroat', 'tagteam', '4way'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_cricket_matches_user ON cricket_matches(user_id);

-- Index for querying by match_id (for quick lookups)
CREATE INDEX IF NOT EXISTS idx_cricket_matches_match_id ON cricket_matches(match_id);

-- Index for querying by game mode
CREATE INDEX IF NOT EXISTS idx_cricket_matches_mode ON cricket_matches(game_mode);

-- Index for querying by creation date
CREATE INDEX IF NOT EXISTS idx_cricket_matches_created ON cricket_matches(created_at DESC);

-- Index for JSONB player data (enables querying guest participation)
CREATE INDEX IF NOT EXISTS idx_cricket_matches_players ON cricket_matches USING GIN(players);

-- RLS Policies for cricket_matches
ALTER TABLE cricket_matches ENABLE ROW LEVEL SECURITY;

-- Users can insert their own matches
CREATE POLICY "Users can insert cricket matches"
  ON cricket_matches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own matches
CREATE POLICY "Users can read own cricket matches"
  ON cricket_matches
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own matches
CREATE POLICY "Users can update own cricket matches"
  ON cricket_matches
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- GOLF MATCHES TABLE
-- ============================================================================
-- Stores complete golf match data for analytics and cross-device syncing
CREATE TABLE IF NOT EXISTS golf_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_data JSONB NOT NULL,
  players JSONB NOT NULL,
  course_id TEXT NOT NULL,
  game_mode TEXT NOT NULL, -- 'stroke', 'match', 'stableford'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_golf_matches_user ON golf_matches(user_id);

-- Index for querying by match_id
CREATE INDEX IF NOT EXISTS idx_golf_matches_match_id ON golf_matches(match_id);

-- Index for querying by course
CREATE INDEX IF NOT EXISTS idx_golf_matches_course ON golf_matches(course_id);

-- Index for querying by game mode
CREATE INDEX IF NOT EXISTS idx_golf_matches_mode ON golf_matches(game_mode);

-- Index for querying by creation date
CREATE INDEX IF NOT EXISTS idx_golf_matches_created ON golf_matches(created_at DESC);

-- Index for JSONB player data
CREATE INDEX IF NOT EXISTS idx_golf_matches_players ON golf_matches USING GIN(players);

-- RLS Policies for golf_matches
ALTER TABLE golf_matches ENABLE ROW LEVEL SECURITY;

-- Users can insert their own matches
CREATE POLICY "Users can insert golf matches"
  ON golf_matches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own matches
CREATE POLICY "Users can read own golf matches"
  ON golf_matches
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own matches
CREATE POLICY "Users can update own golf matches"
  ON golf_matches
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- ADMIN ANALYTICS VIEWS (for future admin dashboard)
-- ============================================================================

-- View for guest player usage analytics
CREATE OR REPLACE VIEW guest_player_analytics AS
SELECT
  gp.id,
  gp.name,
  gp.added_by_user_id,
  gp.created_at,
  COUNT(DISTINCT cm.id) as cricket_match_count,
  COUNT(DISTINCT gm.id) as golf_match_count,
  COUNT(DISTINCT cm.id) + COUNT(DISTINCT gm.id) as total_match_count
FROM guest_players gp
LEFT JOIN cricket_matches cm ON cm.players::text LIKE '%' || gp.id || '%'
LEFT JOIN golf_matches gm ON gm.players::text LIKE '%' || gp.id || '%'
GROUP BY gp.id, gp.name, gp.added_by_user_id, gp.created_at;

-- View for user activity analytics
CREATE OR REPLACE VIEW user_activity_analytics AS
SELECT
  u.id as user_id,
  u.email,
  COUNT(DISTINCT gp.id) as guest_count,
  COUNT(DISTINCT cm.id) as cricket_match_count,
  COUNT(DISTINCT gm.id) as golf_match_count,
  COUNT(DISTINCT cm.id) + COUNT(DISTINCT gm.id) as total_match_count,
  MAX(GREATEST(cm.created_at, gm.created_at)) as last_activity
FROM auth.users u
LEFT JOIN guest_players gp ON gp.added_by_user_id = u.id
LEFT JOIN cricket_matches cm ON cm.user_id = u.id
LEFT JOIN golf_matches gm ON gm.user_id = u.id
GROUP BY u.id, u.email;

-- ============================================================================
-- FUNCTIONS FOR DATA MANAGEMENT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for guest_players updated_at
CREATE TRIGGER update_guest_players_updated_at
  BEFORE UPDATE ON guest_players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE guest_players IS 'Tracks guest players added by users for analytics and cross-device syncing';
COMMENT ON TABLE cricket_matches IS 'Complete cricket match data for user stats and admin analytics';
COMMENT ON TABLE golf_matches IS 'Complete golf match data for user stats and admin analytics';
COMMENT ON VIEW guest_player_analytics IS 'Analytics view showing guest player usage across matches';
COMMENT ON VIEW user_activity_analytics IS 'Analytics view showing user engagement and activity metrics';
