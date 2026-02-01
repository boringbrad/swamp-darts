-- Drop existing table and related objects if they exist
DROP TABLE IF EXISTS friendships CASCADE;
DROP FUNCTION IF EXISTS update_friendships_updated_at() CASCADE;

-- Create friendships table for managing friend relationships
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure users can't be friends with themselves
  CHECK (user_id_1 != user_id_2),

  -- Ensure no duplicate friendships (order doesn't matter)
  UNIQUE (user_id_1, user_id_2)
);

-- Create index for faster lookups
CREATE INDEX idx_friendships_user_id_1 ON friendships(user_id_1);
CREATE INDEX idx_friendships_user_id_2 ON friendships(user_id_2);
CREATE INDEX idx_friendships_status ON friendships(status);

-- RLS Policies
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can view friendships they're part of
CREATE POLICY "Users can view their own friendships"
  ON friendships
  FOR SELECT
  USING (
    auth.uid() = user_id_1 OR
    auth.uid() = user_id_2
  );

-- Users can create friendship requests
CREATE POLICY "Users can create friendship requests"
  ON friendships
  FOR INSERT
  WITH CHECK (
    auth.uid() = requested_by AND
    (auth.uid() = user_id_1 OR auth.uid() = user_id_2)
  );

-- Users can update friendships they're part of (accept/decline)
CREATE POLICY "Users can update their friendships"
  ON friendships
  FOR UPDATE
  USING (
    auth.uid() = user_id_1 OR
    auth.uid() = user_id_2
  );

-- Users can delete friendships they're part of (unfriend)
CREATE POLICY "Users can delete their friendships"
  ON friendships
  FOR DELETE
  USING (
    auth.uid() = user_id_1 OR
    auth.uid() = user_id_2
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friendships_updated_at();
