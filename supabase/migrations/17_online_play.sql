-- Migration 17: Online 1v1 Play
-- Adds game_settings to game_sessions and creates online_game_state for real-time sync

-- Add game_settings JSONB column to game_sessions
-- Stores: { gameType, variant, rules } so both players know what they're playing
ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS game_settings JSONB DEFAULT '{}';

-- ============================================================================
-- ONLINE GAME STATE TABLE
-- One row per active online session; updated after each player's turn
-- ============================================================================

CREATE TABLE IF NOT EXISTS online_game_state (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  current_player_id TEXT NOT NULL,  -- user_id of the player whose turn it currently is
  game_state       JSONB NOT NULL,  -- full serialized game state snapshot
  move_number      INTEGER DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT online_game_state_session_unique UNIQUE (session_id)
);

-- Index for quick lookup by session
CREATE INDEX IF NOT EXISTS idx_online_game_state_session ON online_game_state(session_id);

-- Enable RLS
ALTER TABLE online_game_state ENABLE ROW LEVEL SECURITY;

-- Participants in the session can read game state
CREATE POLICY "Online game state readable by session participants"
  ON online_game_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.session_id = online_game_state.session_id
        AND sp.user_id = auth.uid()
        AND sp.left_at IS NULL
    )
  );

-- Participants can insert the initial state row
CREATE POLICY "Online game state insertable by session participants"
  ON online_game_state FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.session_id = online_game_state.session_id
        AND sp.user_id = auth.uid()
        AND sp.left_at IS NULL
    )
  );

-- Participants can update game state (enforced by app logic for whose turn it is)
CREATE POLICY "Online game state updatable by session participants"
  ON online_game_state FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.session_id = online_game_state.session_id
        AND sp.user_id = auth.uid()
        AND sp.left_at IS NULL
    )
  );

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON online_game_state TO authenticated;

-- Enable realtime for game state changes
ALTER PUBLICATION supabase_realtime ADD TABLE online_game_state;
