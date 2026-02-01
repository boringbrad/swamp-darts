-- ============================================================================
-- ADMIN ACCESS TO ALL MATCHES
-- ============================================================================
-- Allows admin users to read all cricket and golf matches for analytics

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can read all cricket matches" ON cricket_matches;
DROP POLICY IF EXISTS "Admins can read all golf matches" ON golf_matches;

-- Cricket matches: Allow admins to read all matches
CREATE POLICY "Admins can read all cricket matches"
  ON cricket_matches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Golf matches: Allow admins to read all matches
CREATE POLICY "Admins can read all golf matches"
  ON golf_matches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
