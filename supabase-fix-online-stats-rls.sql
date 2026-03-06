-- Fix RLS policies so online match participants can read each other's match records.
--
-- Problem: the SELECT policy only allows reading rows where user_id = auth.uid().
-- For online matches, the host saves the record (user_id = host). The guest's user ID
-- is stored in participant_user_ids[], but RLS blocks the guest from reading the row
-- before the app-level .or() filter even runs.
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

-- ── cricket_matches ────────────────────────────────────────────────────────────

-- Drop any existing SELECT policies (try common auto-generated names)
DROP POLICY IF EXISTS "Users can view their own matches" ON cricket_matches;
DROP POLICY IF EXISTS "Users can read own cricket matches" ON cricket_matches;
DROP POLICY IF EXISTS "Users can read own and participated cricket matches" ON cricket_matches;
DROP POLICY IF EXISTS "Enable read access for own matches" ON cricket_matches;
DROP POLICY IF EXISTS "select_own_matches" ON cricket_matches;

-- Create the correct policy
CREATE POLICY "Users can read own and participated cricket matches"
  ON cricket_matches
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid()::text = ANY(participant_user_ids)
  );

-- ── golf_matches ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view their own matches" ON golf_matches;
DROP POLICY IF EXISTS "Users can read own golf matches" ON golf_matches;
DROP POLICY IF EXISTS "Users can read own and participated golf matches" ON golf_matches;
DROP POLICY IF EXISTS "Enable read access for own matches" ON golf_matches;
DROP POLICY IF EXISTS "select_own_matches" ON golf_matches;

CREATE POLICY "Users can read own and participated golf matches"
  ON golf_matches
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid()::text = ANY(participant_user_ids)
  );
