-- Fix venue activation to be atomic
-- This function handles all 3 operations in a single transaction

CREATE OR REPLACE FUNCTION activate_venue_account(
  user_id_param UUID,
  venue_name_param TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  room_code TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  generated_room_code TEXT;
  qr_data_json TEXT;
BEGIN
  -- Start transaction (implicit in function)

  -- Step 1: Generate unique room code
  generated_room_code := generate_venue_room_code();

  IF generated_room_code IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Failed to generate room code';
    RETURN;
  END IF;

  -- Step 2: Create QR data JSON
  qr_data_json := json_build_object(
    'type', 'venue_join',
    'venueId', user_id_param,
    'roomCode', generated_room_code,
    'venueName', venue_name_param
  )::TEXT;

  -- Step 3: Update profile (atomically with everything else)
  UPDATE profiles
  SET
    account_type = 'venue',
    venue_name = venue_name_param,
    venue_room_code = generated_room_code,
    venue_qr_data = qr_data_json,
    updated_at = NOW()
  WHERE id = user_id_param;

  -- Check if profile was updated
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Profile not found';
    RETURN;
  END IF;

  -- Step 4: Create default board (only if it doesn't exist)
  -- Use INSERT ... ON CONFLICT to make idempotent
  INSERT INTO venue_boards (venue_id, board_name, board_order, is_active)
  VALUES (user_id_param, 'Board 1', 0, TRUE)
  ON CONFLICT DO NOTHING;

  -- Success! All 3 operations completed atomically
  RETURN QUERY SELECT TRUE, generated_room_code, NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    -- Any error rolls back the entire transaction
    RETURN QUERY SELECT FALSE, NULL::TEXT, SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION activate_venue_account(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION activate_venue_account IS 'Atomically activates a venue account with room code generation, profile update, and default board creation';
