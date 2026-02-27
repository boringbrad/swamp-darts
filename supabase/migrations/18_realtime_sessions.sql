-- Migration 18: Enable Realtime for session tables
-- Required for the waiting room and lobby list to update in real-time
-- when guests join/leave and when the host starts the game.

ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
