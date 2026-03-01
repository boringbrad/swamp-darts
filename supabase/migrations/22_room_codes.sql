-- Migration: Permanent Room Code System
-- Replaces the ephemeral game night session approach.
-- Every user has a permanent room code. Friends enter the code to join
-- the player pool (room_members). No expiry, no Realtime needed.

-- ============================================================
-- 1. Add room_code column to profiles
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS room_code TEXT;

-- Generate unique 6-char codes for any profiles that don't have one yet.
-- Uses a portion of the MD5 of their UUID + some salt for uniqueness.
DO $$
DECLARE
  rec RECORD;
  candidate TEXT;
  attempts  INT;
BEGIN
  FOR rec IN SELECT id FROM profiles WHERE room_code IS NULL LOOP
    candidate := NULL;
    attempts  := 0;
    WHILE candidate IS NULL AND attempts < 200 LOOP
      candidate := UPPER(SUBSTRING(MD5(rec.id::text || attempts::text), 1, 6));
      IF EXISTS (SELECT 1 FROM profiles WHERE room_code = candidate) THEN
        candidate := NULL;
      END IF;
      attempts := attempts + 1;
    END LOOP;
    UPDATE profiles SET room_code = candidate WHERE id = rec.id;
  END LOOP;
END
$$;

-- Make room_code unique (now that all existing rows have one)
ALTER TABLE profiles ADD CONSTRAINT profiles_room_code_unique UNIQUE (room_code);

-- Function: auto-generate room_code on new profile INSERT
CREATE OR REPLACE FUNCTION generate_room_code_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate TEXT;
  attempts  INT := 0;
BEGIN
  IF NEW.room_code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  WHILE candidate IS NULL AND attempts < 200 LOOP
    candidate := UPPER(SUBSTRING(MD5(NEW.id::text || RANDOM()::text || NOW()::text), 1, 6));
    IF EXISTS (SELECT 1 FROM profiles WHERE room_code = candidate) THEN
      candidate := NULL;
    END IF;
    attempts := attempts + 1;
  END LOOP;
  NEW.room_code := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_room_code_on_insert ON profiles;
CREATE TRIGGER set_room_code_on_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.room_code IS NULL)
  EXECUTE FUNCTION generate_room_code_fn();

-- ============================================================
-- 2. room_members — tracks who has joined whose player pool
-- ============================================================
CREATE TABLE IF NOT EXISTS room_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_owner_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_user_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name    TEXT NOT NULL,
  avatar          TEXT,
  photo_url       TEXT,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_owner_id, member_user_id)
);

ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

-- Room owner: full control over their room members
DROP POLICY IF EXISTS "owner can manage room members" ON room_members;
CREATE POLICY "owner can manage room members"
  ON room_members FOR ALL
  USING (room_owner_id = auth.uid());

-- Member: can see and remove themselves
DROP POLICY IF EXISTS "member can manage self" ON room_members;
CREATE POLICY "member can manage self"
  ON room_members FOR ALL
  USING (member_user_id = auth.uid());

GRANT ALL ON public.room_members TO authenticated;
