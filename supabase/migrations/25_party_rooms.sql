-- Migration 25: Party Rooms
-- Persistent multi-game lobbies (up to 4 players).
-- Players join once and stay until the host closes the room.
-- Individual games within a party use the existing game_sessions machinery.

-- ── party_rooms ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS party_rooms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code        TEXT UNIQUE NOT NULL,
  host_user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'closed')),
  -- UUID of the active game_sessions row while a game is running; null in lobby
  current_session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '8 hours',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_party_rooms_code   ON party_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_party_rooms_host   ON party_rooms(host_user_id);
CREATE INDEX IF NOT EXISTS idx_party_rooms_status ON party_rooms(status);

-- ── party_members ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS party_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        UUID NOT NULL REFERENCES party_rooms(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name   TEXT NOT NULL,
  avatar         TEXT,
  photo_url      TEXT,
  is_sitting_out BOOLEAN NOT NULL DEFAULT false,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at        TIMESTAMPTZ,
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_party_members_room ON party_members(room_id);
CREATE INDEX IF NOT EXISTS idx_party_members_user ON party_members(user_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE party_rooms   ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;

-- party_rooms: any authenticated user can read open rooms (needed to join by code)
CREATE POLICY "party_rooms_select"
  ON party_rooms FOR SELECT TO authenticated
  USING (true);

-- party_rooms: authenticated users can create their own rooms
CREATE POLICY "party_rooms_insert"
  ON party_rooms FOR INSERT TO authenticated
  WITH CHECK (host_user_id = auth.uid());

-- party_rooms: only the host can update (start game, close room, clear current_session)
CREATE POLICY "party_rooms_update"
  ON party_rooms FOR UPDATE TO authenticated
  USING (host_user_id = auth.uid());

-- party_rooms: only the host can delete
CREATE POLICY "party_rooms_delete"
  ON party_rooms FOR DELETE TO authenticated
  USING (host_user_id = auth.uid());

-- party_members: any authenticated user can read (needed to validate room capacity)
CREATE POLICY "party_members_select"
  ON party_members FOR SELECT TO authenticated
  USING (true);

-- party_members: authenticated users can insert their own member record
CREATE POLICY "party_members_insert"
  ON party_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- party_members: members can update their own record (sit out, left_at)
CREATE POLICY "party_members_update"
  ON party_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON party_rooms   TO authenticated;
GRANT SELECT, INSERT, UPDATE ON party_members TO authenticated;

-- ── Realtime ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE party_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE party_members;
