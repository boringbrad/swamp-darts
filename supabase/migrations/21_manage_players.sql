-- Migration: Manage Players + Local Session System
-- Adds local_game_invites table for verified friend invite flow
-- Adds participant_user_ids to match tables for multi-user stat attribution

-- ============================================================
-- local_game_invites table
-- ============================================================
CREATE TABLE IF NOT EXISTS local_game_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  host_profile    JSONB NOT NULL DEFAULT '{}',     -- { displayName, avatar, photoUrl }
  invited_profile JSONB NOT NULL DEFAULT '{}',     -- filled by friend on accept
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '8 hours')
);

ALTER TABLE local_game_invites ENABLE ROW LEVEL SECURITY;

-- Host can insert, read, and delete their own invites
CREATE POLICY "host can manage invites"
  ON local_game_invites FOR ALL
  USING (host_user_id = auth.uid());

-- Invited user can read their invite (to show the confirmation page)
CREATE POLICY "invited user can read invite"
  ON local_game_invites FOR SELECT
  USING (invited_user_id = auth.uid());

-- Invited user can update their invite (to accept it)
CREATE POLICY "invited user can accept invite"
  ON local_game_invites FOR UPDATE
  USING (invited_user_id = auth.uid());

-- Enable Realtime so host device gets instant notification when friend accepts
ALTER PUBLICATION supabase_realtime ADD TABLE local_game_invites;

-- ============================================================
-- Stat attribution columns on match tables
-- ============================================================

-- Array of user_ids of verified players who participated but are not the match owner
ALTER TABLE cricket_matches
  ADD COLUMN IF NOT EXISTS participant_user_ids TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE golf_matches
  ADD COLUMN IF NOT EXISTS participant_user_ids TEXT[] NOT NULL DEFAULT '{}';

-- Index for efficient "find matches I was a participant in" queries
CREATE INDEX IF NOT EXISTS idx_cricket_matches_participants
  ON cricket_matches USING GIN (participant_user_ids);

CREATE INDEX IF NOT EXISTS idx_golf_matches_participants
  ON golf_matches USING GIN (participant_user_ids);
