-- Migration: Manage Players + Local Session System
-- Replaces local_game_invites approach with a broadcast model:
-- Host opens a session, friends see it on their Friends page and join themselves.

-- ============================================================
-- player_sessions — host broadcasts their game night is open
-- ============================================================
CREATE TABLE IF NOT EXISTS player_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  host_profile JSONB NOT NULL DEFAULT '{}',    -- { displayName, avatar, photoUrl }
  status       TEXT NOT NULL DEFAULT 'open',   -- 'open' | 'closed'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '8 hours')
);

ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;

-- Host can fully manage their own sessions
CREATE POLICY "host can manage sessions"
  ON player_sessions FOR ALL
  USING (host_user_id = auth.uid());

-- Any authenticated user can read open, non-expired sessions
-- (app layer filters to friends only)
CREATE POLICY "anyone can read open sessions"
  ON player_sessions FOR SELECT
  USING (status = 'open' AND expires_at > NOW());

ALTER PUBLICATION supabase_realtime ADD TABLE player_sessions;

-- ============================================================
-- player_session_participants — friends who joined a session
-- ============================================================
CREATE TABLE IF NOT EXISTS player_session_participants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID REFERENCES player_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  avatar       TEXT,
  photo_url    TEXT,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, user_id)
);

ALTER TABLE player_session_participants ENABLE ROW LEVEL SECURITY;

-- Participants can manage their own rows (join and leave)
CREATE POLICY "participant can manage self"
  ON player_session_participants FOR ALL
  USING (user_id = auth.uid());

-- Host can read and remove participants from their session
CREATE POLICY "host can manage participants"
  ON player_session_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM player_sessions ps
      WHERE ps.id = session_id
        AND ps.host_user_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE player_session_participants;

-- ============================================================
-- Stat attribution columns on match tables
-- ============================================================
ALTER TABLE cricket_matches
  ADD COLUMN IF NOT EXISTS participant_user_ids TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE golf_matches
  ADD COLUMN IF NOT EXISTS participant_user_ids TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_cricket_matches_participants
  ON cricket_matches USING GIN (participant_user_ids);

CREATE INDEX IF NOT EXISTS idx_golf_matches_participants
  ON golf_matches USING GIN (participant_user_ids);
