-- Migration 27: Party Room Messages
-- Persistent chat for party room lobbies.
-- Messages survive page refreshes and persist across multiple games in the room.

CREATE TABLE IF NOT EXISTS party_room_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID NOT NULL REFERENCES party_rooms(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  display_name TEXT NOT NULL,
  message      TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_party_room_messages_room
  ON party_room_messages(room_id, created_at);

ALTER TABLE party_room_messages ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read messages in a room (they need the room UUID anyway)
CREATE POLICY "party_room_messages_select"
  ON party_room_messages FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can insert their own messages
CREATE POLICY "party_room_messages_insert"
  ON party_room_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT ON party_room_messages TO authenticated;

-- Enable Realtime so new messages stream instantly
ALTER PUBLICATION supabase_realtime ADD TABLE party_room_messages;
