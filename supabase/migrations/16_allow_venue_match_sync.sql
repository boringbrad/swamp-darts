-- Migration 16: Allow Venue Match Syncing
-- Updates RLS policies to allow venue owners to create match copies for their participants
-- This enables cross-device stat syncing for venue games

-- ============================================================================
-- Update RLS policies for golf_matches
-- ============================================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can insert golf matches" ON golf_matches;

-- Create new policy that allows:
-- 1. Users to insert their own matches (user_id = auth.uid())
-- 2. Venue owners to insert matches for their participants (for stat syncing)
CREATE POLICY "Users and venue owners can insert golf matches"
  ON golf_matches
  FOR INSERT
  WITH CHECK (
    -- User inserting their own match
    auth.uid() = user_id
    OR
    -- Venue owner inserting match for a participant
    (
      venue_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND account_type = 'venue'
          AND id = golf_matches.venue_id
      )
    )
  );

-- ============================================================================
-- Update RLS policies for cricket_matches
-- ============================================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can insert cricket matches" ON cricket_matches;

-- Create new policy that allows:
-- 1. Users to insert their own matches (user_id = auth.uid())
-- 2. Venue owners to insert matches for their participants (for stat syncing)
CREATE POLICY "Users and venue owners can insert cricket matches"
  ON cricket_matches
  FOR INSERT
  WITH CHECK (
    -- User inserting their own match
    auth.uid() = user_id
    OR
    -- Venue owner inserting match for a participant
    (
      venue_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND account_type = 'venue'
          AND id = cricket_matches.venue_id
      )
    )
  );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Users and venue owners can insert golf matches" ON golf_matches
  IS 'Allows users to insert their own matches and venue owners to create match copies for their participants';

COMMENT ON POLICY "Users and venue owners can insert cricket matches" ON cricket_matches
  IS 'Allows users to insert their own matches and venue owners to create match copies for their participants';
