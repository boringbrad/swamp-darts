-- ============================================================================
-- Enable Realtime for Venue Tables
-- ============================================================================
-- This migration enables Supabase Realtime for venue-related tables so that
-- changes are broadcast to subscribed clients in real-time.
-- ============================================================================

-- Enable realtime for venue_participants table
-- This allows venue devices to receive updates when players join/leave
ALTER PUBLICATION supabase_realtime ADD TABLE venue_participants;

-- Enable realtime for venue_boards table
-- This allows real-time updates when boards are created/modified
ALTER PUBLICATION supabase_realtime ADD TABLE venue_boards;

-- Enable realtime for venue_guests table
-- This allows real-time updates when guest players are created/modified
ALTER PUBLICATION supabase_realtime ADD TABLE venue_guests;
