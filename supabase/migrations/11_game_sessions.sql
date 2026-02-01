-- Migration 11: Game Sessions for Local Multiplayer
-- Creates tables for multiplayer game sessions where users can join via QR/room codes

-- Drop existing objects if they exist
DROP TABLE IF EXISTS session_match_results CASCADE;
DROP TABLE IF EXISTS session_participants CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TYPE IF EXISTS session_status_type CASCADE;
DROP FUNCTION IF EXISTS generate_room_code() CASCADE;
DROP FUNCTION IF EXISTS expire_old_game_sessions() CASCADE;

-- Create enum for session status
CREATE TYPE session_status_type AS ENUM ('lobby', 'in_game', 'completed', 'expired');

-- Game Sessions Table
-- Main table for multiplayer game sessions
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  host_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_mode TEXT NOT NULL,
  status session_status_type DEFAULT 'lobby' NOT NULL,
  max_participants INTEGER, -- NULL for unlimited (venues), 4 for players
  game_id TEXT, -- References match_id in cricket_matches or golf_matches
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '4 hours',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Session Participants Table
-- Tracks who's in each session (authenticated users or guests)
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  guest_name TEXT,
  guest_avatar TEXT,
  is_host BOOLEAN DEFAULT false NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  left_at TIMESTAMPTZ,
  CHECK (user_id IS NOT NULL OR guest_name IS NOT NULL)
);

-- Session Match Results Table
-- Links completed matches to session participants for stats syncing
CREATE TABLE session_match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
  match_table TEXT NOT NULL, -- 'cricket_matches' or 'golf_matches'
  match_id TEXT NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(participant_id, match_id)
);

-- Indexes for performance
CREATE INDEX idx_game_sessions_room_code ON game_sessions(room_code);
CREATE INDEX idx_game_sessions_host ON game_sessions(host_user_id);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_game_sessions_expires_at ON game_sessions(expires_at);
CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_user ON session_participants(user_id);
CREATE INDEX idx_session_participants_left_at ON session_participants(left_at);
CREATE INDEX idx_session_match_results_session ON session_match_results(session_id);
CREATE INDEX idx_session_match_results_participant ON session_match_results(participant_id);

-- Enable RLS
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_match_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_sessions

-- Anyone authenticated can view active sessions (for joining)
CREATE POLICY "Active sessions viewable by authenticated users"
  ON game_sessions FOR SELECT
  TO authenticated
  USING (status IN ('lobby', 'in_game'));

-- Users can create their own sessions
CREATE POLICY "Users can create their own sessions"
  ON game_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_user_id);

-- Hosts can update their own sessions
CREATE POLICY "Hosts can update their sessions"
  ON game_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_user_id);

-- RLS Policies for session_participants

-- Anyone can view participants of sessions they can see
CREATE POLICY "Participants viewable by authenticated users"
  ON session_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions
      WHERE id = session_id
      AND status IN ('lobby', 'in_game')
    )
  );

-- Authenticated users can join sessions
CREATE POLICY "Users can join sessions as themselves"
  ON session_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Participants can update their own record (to leave)
CREATE POLICY "Participants can leave sessions"
  ON session_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for session_match_results

-- Participants can view their own results
CREATE POLICY "Participants can view their results"
  ON session_match_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE id = participant_id
      AND user_id = auth.uid()
    )
  );

-- System can insert match results (via host or backend)
CREATE POLICY "System can insert match results"
  ON session_match_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Room code generation function
-- Generates a 6-character alphanumeric code excluding ambiguous characters
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  chars TEXT := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Auto-expire old sessions function
-- Expires sessions that are past their expiration time
CREATE OR REPLACE FUNCTION expire_old_game_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE game_sessions
  SET status = 'expired'
  WHERE status IN ('lobby', 'in_game')
  AND expires_at < NOW();
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.completed_at = CASE
    WHEN NEW.status = 'completed' AND OLD.status != 'completed' THEN NOW()
    ELSE NEW.completed_at
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER game_sessions_updated_at
  BEFORE UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_game_sessions_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON game_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON session_participants TO authenticated;
GRANT SELECT, INSERT ON session_match_results TO authenticated;
