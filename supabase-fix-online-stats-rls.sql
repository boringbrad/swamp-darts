-- Fix RLS policies on cricket_matches and golf_matches.
--
-- Problems solved:
--   1. SELECT: guest could not read host's match row (participant_user_ids not in policy)
--   2. INSERT/UPSERT: if no INSERT policy exists, syncs fail silently → no stats
--   3. UPDATE: same issue for match upserts that hit an existing row
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

-- ── cricket_matches ────────────────────────────────────────────────────────────

-- SELECT: allow reading own rows OR rows you participated in
DROP POLICY IF EXISTS "participants can read cricket matches" ON cricket_matches;
DROP POLICY IF EXISTS "Users can view their own matches" ON cricket_matches;
DROP POLICY IF EXISTS "Users can read own cricket matches" ON cricket_matches;
DROP POLICY IF EXISTS "Users can read own and participated cricket matches" ON cricket_matches;
DROP POLICY IF EXISTS "Enable read access for own matches" ON cricket_matches;
DROP POLICY IF EXISTS "select_own_matches" ON cricket_matches;

CREATE POLICY "participants can read cricket matches"
  ON cricket_matches
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid()::text = ANY(participant_user_ids)
  );

-- INSERT: allow users to insert rows they own
DROP POLICY IF EXISTS "Users can insert own cricket matches" ON cricket_matches;

CREATE POLICY "Users can insert own cricket matches"
  ON cricket_matches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: allow users to update their own rows (needed for upsert)
DROP POLICY IF EXISTS "Users can update own cricket matches" ON cricket_matches;

CREATE POLICY "Users can update own cricket matches"
  ON cricket_matches
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ── golf_matches ───────────────────────────────────────────────────────────────

-- SELECT
DROP POLICY IF EXISTS "participants can read golf matches" ON golf_matches;
DROP POLICY IF EXISTS "Users can view their own matches" ON golf_matches;
DROP POLICY IF EXISTS "Users can read own golf matches" ON golf_matches;
DROP POLICY IF EXISTS "Users can read own and participated golf matches" ON golf_matches;
DROP POLICY IF EXISTS "Enable read access for own matches" ON golf_matches;
DROP POLICY IF EXISTS "select_own_matches" ON golf_matches;

CREATE POLICY "participants can read golf matches"
  ON golf_matches
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid()::text = ANY(participant_user_ids)
  );

-- INSERT
DROP POLICY IF EXISTS "Users can insert own golf matches" ON golf_matches;

CREATE POLICY "Users can insert own golf matches"
  ON golf_matches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE
DROP POLICY IF EXISTS "Users can update own golf matches" ON golf_matches;

CREATE POLICY "Users can update own golf matches"
  ON golf_matches
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ── guest_players ───────────────────────────────────────────────────────────────
-- upsert (onConflict: 'id') requires both INSERT and UPDATE policies

DROP POLICY IF EXISTS "Users can insert own guest players" ON guest_players;
DROP POLICY IF EXISTS "Users can update own guest players" ON guest_players;
DROP POLICY IF EXISTS "Users can read own guest players" ON guest_players;

CREATE POLICY "Users can read own guest players"
  ON guest_players
  FOR SELECT
  USING (auth.uid() = added_by_user_id);

CREATE POLICY "Users can insert own guest players"
  ON guest_players
  FOR INSERT
  WITH CHECK (auth.uid() = added_by_user_id);

CREATE POLICY "Users can update own guest players"
  ON guest_players
  FOR UPDATE
  USING (auth.uid() = added_by_user_id);
