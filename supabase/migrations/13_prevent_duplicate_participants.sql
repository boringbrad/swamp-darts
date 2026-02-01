-- Migration 13: Prevent Duplicate Active Participants
-- Adds a unique partial index to prevent the same user from having multiple active participant records in the same session

-- First, clean up any existing duplicates by keeping only the oldest participant record for each user/session combination
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY session_id, user_id
      WHERE left_at IS NULL
      ORDER BY joined_at ASC
    ) as rn
  FROM session_participants
  WHERE user_id IS NOT NULL
    AND left_at IS NULL
)
UPDATE session_participants
SET left_at = NOW()
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Create a unique partial index to prevent duplicate active participants
-- This ensures a user can only have one active (left_at IS NULL) participant record per session
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_participant_per_session
ON session_participants (session_id, user_id)
WHERE left_at IS NULL AND user_id IS NOT NULL;

-- Note: Guest participants (user_id IS NULL) are not covered by this constraint
-- as they are identified by guest_name which may not be unique
