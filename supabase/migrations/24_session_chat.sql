-- Migration 24: Session Chat
-- Adds real-time chat to online game sessions (lobby + in-game).
-- Messages are persisted so they survive a WebSocket drop/reconnect.

CREATE TABLE IF NOT EXISTS session_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  display_name TEXT NOT NULL,
  message      TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_messages_session
  ON session_messages(session_id, created_at);

ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;

-- Active participants in the session can read all messages
CREATE POLICY "session_messages_select"
  ON session_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.session_id = session_messages.session_id
        AND sp.user_id    = auth.uid()
    )
  );

-- Active participants can send messages
CREATE POLICY "session_messages_insert"
  ON session_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.session_id = session_messages.session_id
        AND sp.user_id    = auth.uid()
        AND sp.left_at    IS NULL
    )
  );

GRANT SELECT, INSERT ON session_messages TO authenticated;

-- Enable Realtime so new messages stream to all participants instantly
ALTER PUBLICATION supabase_realtime ADD TABLE session_messages;
