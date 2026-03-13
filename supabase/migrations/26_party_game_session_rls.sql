-- Migration 26: Allow session hosts to insert participant records for others
-- Without this, startPartyGame (host inserting guest's session_participants row) fails RLS.
-- The existing policy only allows: user_id = auth.uid() OR user_id IS NULL
-- New policy additionally allows the session host to insert any participant.

CREATE POLICY "Session hosts can insert participants"
  ON session_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions
      WHERE id = session_id
        AND host_user_id = auth.uid()
    )
  );
