-- Migration: Allow match participants to read matches they appear in.
-- Without this, the participant_user_ids OR filter in stats queries is
-- blocked by RLS for anyone who isn't the match owner (user_id).

-- Cricket
CREATE POLICY "participants can read cricket matches"
  ON public.cricket_matches FOR SELECT
  USING (auth.uid()::text = ANY(participant_user_ids));

-- Golf
CREATE POLICY "participants can read golf matches"
  ON public.golf_matches FOR SELECT
  USING (auth.uid()::text = ANY(participant_user_ids));
