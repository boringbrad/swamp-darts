-- Migration 12: Update Sessions - Remove Game Mode
-- Sessions are now game-agnostic "rooms" where people hang out
-- Games are played independently and can use any session members

-- Remove game_mode and game_id columns (sessions don't track specific games)
ALTER TABLE game_sessions DROP COLUMN IF EXISTS game_mode;
ALTER TABLE game_sessions DROP COLUMN IF EXISTS game_id;

-- Add games_played counter to track session activity
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0;

-- Update session_match_results to include which players actually played
-- (not all session participants play every game)
ALTER TABLE session_match_results ADD COLUMN IF NOT EXISTS player_id TEXT;
ALTER TABLE session_match_results ADD COLUMN IF NOT EXISTS player_name TEXT;

-- Add comment for clarity
COMMENT ON TABLE game_sessions IS 'Multiplayer sessions (rooms) where players hang out and play multiple games together';
COMMENT ON COLUMN game_sessions.games_played IS 'Number of games completed in this session';
COMMENT ON COLUMN session_match_results.player_id IS 'The specific player who participated in this game (may be guest or user)';
COMMENT ON COLUMN session_match_results.player_name IS 'Player display name for reference';
