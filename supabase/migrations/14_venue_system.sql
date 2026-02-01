-- Migration 14: Venue Account System
-- Adds support for venue accounts with multi-board management and universal player pools

-- ============================================================================
-- 1. Add venue fields to profiles table
-- ============================================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS venue_name TEXT,
ADD COLUMN IF NOT EXISTS venue_room_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS venue_qr_data TEXT;

-- Index for fast room code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_venue_room_code ON profiles(venue_room_code);

-- ============================================================================
-- 2. Create venue_boards table (for multi-board venues)
-- ============================================================================

CREATE TABLE IF NOT EXISTS venue_boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  board_name TEXT NOT NULL,
  board_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_venue_board UNIQUE(venue_id, board_name)
);

-- RLS Policies for venue_boards
ALTER TABLE venue_boards ENABLE ROW LEVEL SECURITY;

-- Venue owners can manage their boards
CREATE POLICY "Venue owners can manage their boards"
  ON venue_boards
  FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND account_type = 'venue'
    )
  );

-- Anyone can view active boards
CREATE POLICY "Anyone can view active boards"
  ON venue_boards
  FOR SELECT
  USING (is_active = true);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_venue_boards_venue_id ON venue_boards(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_boards_active ON venue_boards(venue_id, is_active);

-- ============================================================================
-- 3. Create venue_participants table (universal player pool)
-- ============================================================================

CREATE TABLE IF NOT EXISTS venue_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  guest_id UUID, -- References venue_guests, can't FK yet (created below)
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Either user_id OR guest_id must be set, not both
  CONSTRAINT user_or_guest CHECK (
    (user_id IS NOT NULL AND guest_id IS NULL) OR
    (user_id IS NULL AND guest_id IS NOT NULL)
  ),

  -- Prevent duplicate participants
  CONSTRAINT unique_venue_user UNIQUE(venue_id, user_id),
  CONSTRAINT unique_venue_guest UNIQUE(venue_id, guest_id)
);

-- RLS Policies for venue_participants
ALTER TABLE venue_participants ENABLE ROW LEVEL SECURITY;

-- Anyone can view participants at a venue
CREATE POLICY "Anyone can view venue participants"
  ON venue_participants
  FOR SELECT
  USING (true);

-- Authenticated users can join venues
CREATE POLICY "Users can join venues"
  ON venue_participants
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Venue owners can manage all participants
CREATE POLICY "Venue owners can manage participants"
  ON venue_participants
  FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND account_type = 'venue'
    )
  );

-- Users can update their own participation status
CREATE POLICY "Users can update their own participation"
  ON venue_participants
  FOR UPDATE
  USING (user_id = auth.uid());

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_venue_participants_venue_id ON venue_participants(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_participants_user_id ON venue_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_participants_active ON venue_participants(venue_id, is_active);
CREATE INDEX IF NOT EXISTS idx_venue_participants_last_seen ON venue_participants(venue_id, last_seen_at DESC);

-- ============================================================================
-- 4. Create venue_guests table (venue-specific guest players)
-- ============================================================================

CREATE TABLE IF NOT EXISTS venue_guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT 'avatar-1',
  photo_url TEXT,
  total_games INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_venue_guest_name UNIQUE(venue_id, guest_name)
);

-- RLS Policies for venue_guests
ALTER TABLE venue_guests ENABLE ROW LEVEL SECURITY;

-- Anyone can view venue guests
CREATE POLICY "Anyone can view venue guests"
  ON venue_guests
  FOR SELECT
  USING (true);

-- Venue owners can manage their guests
CREATE POLICY "Venue owners can manage guests"
  ON venue_guests
  FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND account_type = 'venue'
    )
  );

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_venue_guests_venue_id ON venue_guests(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_guests_total_games ON venue_guests(venue_id, total_games DESC);

-- Now add FK constraint from venue_participants to venue_guests
ALTER TABLE venue_participants
ADD CONSTRAINT fk_venue_participants_guest
FOREIGN KEY (guest_id) REFERENCES venue_guests(id) ON DELETE CASCADE;

-- ============================================================================
-- 5. Add venue fields to match tables
-- ============================================================================

-- Add venue_id and board_id to cricket_matches
ALTER TABLE cricket_matches
ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES venue_boards(id) ON DELETE SET NULL;

-- Add venue_id and board_id to golf_matches
ALTER TABLE golf_matches
ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES venue_boards(id) ON DELETE SET NULL;

-- Indexes for venue match queries
CREATE INDEX IF NOT EXISTS idx_cricket_matches_venue_id ON cricket_matches(venue_id);
CREATE INDEX IF NOT EXISTS idx_cricket_matches_board_id ON cricket_matches(board_id);
CREATE INDEX IF NOT EXISTS idx_cricket_matches_venue_board ON cricket_matches(venue_id, board_id);

CREATE INDEX IF NOT EXISTS idx_golf_matches_venue_id ON golf_matches(venue_id);
CREATE INDEX IF NOT EXISTS idx_golf_matches_board_id ON golf_matches(board_id);
CREATE INDEX IF NOT EXISTS idx_golf_matches_venue_board ON golf_matches(venue_id, board_id);

-- ============================================================================
-- 6. Helper function to generate unique room codes
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_venue_room_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chars TEXT := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; -- Excludes confusing chars: 0/O, 1/I/L
  code TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    -- Generate random 6-character code
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE venue_room_code = code) THEN
      RETURN code;
    END IF;

    -- Prevent infinite loop (should never happen with 1 billion combinations)
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Failed to generate unique room code after 100 attempts';
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- 7. Function to update last_seen_at for venue participants
-- ============================================================================

CREATE OR REPLACE FUNCTION update_participant_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_seen_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_participant_last_seen_trigger
  BEFORE UPDATE ON venue_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_last_seen();

-- ============================================================================
-- 8. Function to increment guest game count
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_guest_game_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a match is inserted with a venue_id, check if any players are guests
  -- and increment their game count
  -- This will be called from application code when syncing stats
  RETURN NEW;
END;
$$;

-- Note: Guest game count will be incremented from application code during stats sync
