-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for account types
CREATE TYPE account_type AS ENUM ('player', 'venue');

-- Create enum for session status
CREATE TYPE session_status AS ENUM ('active', 'expired', 'completed');

-- Create enum for game modes
CREATE TYPE game_mode AS ENUM ('cricket_singles', 'cricket_tag_team', 'cricket_4way', 'golf_stroke_play', 'golf_match_play', 'royal_rumble', 'extra_games');

-- =====================================================
-- USERS TABLE (extends Supabase auth.users)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  username TEXT UNIQUE,
  avatar TEXT, -- avatar identifier (e.g., 'avatar-1')
  photo_url TEXT, -- custom uploaded photo URL
  account_type account_type DEFAULT 'player' NOT NULL,
  is_venue_approved BOOLEAN DEFAULT false,
  venue_approval_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- VENUES TABLE
-- =====================================================
CREATE TABLE public.venues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  venue_name TEXT NOT NULL,
  venue_location TEXT,
  qr_code_payload TEXT UNIQUE, -- Current active QR code
  invite_quota INTEGER DEFAULT 50, -- How many guest invites allowed
  invites_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Venues policies
CREATE POLICY "Venues are viewable by everyone"
  ON public.venues FOR SELECT
  USING (true);

CREATE POLICY "Venue owners can update their venues"
  ON public.venues FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Approved venue accounts can create venues"
  ON public.venues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND account_type = 'venue'
      AND is_venue_approved = true
    )
  );

-- =====================================================
-- VENUE SESSIONS TABLE
-- =====================================================
CREATE TABLE public.venue_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT UNIQUE NOT NULL, -- Token from QR scan
  status session_status DEFAULT 'active' NOT NULL,
  approved_duration_hours INTEGER NOT NULL, -- Player chooses this
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.venue_sessions ENABLE ROW LEVEL SECURITY;

-- Venue sessions policies
CREATE POLICY "Sessions viewable by venue owner and player"
  ON public.venue_sessions FOR SELECT
  USING (
    auth.uid() = player_id OR
    EXISTS (SELECT 1 FROM public.venues WHERE id = venue_id AND owner_id = auth.uid())
  );

CREATE POLICY "Players can create their own sessions"
  ON public.venue_sessions FOR INSERT
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can update their own sessions"
  ON public.venue_sessions FOR UPDATE
  USING (auth.uid() = player_id);

-- =====================================================
-- GUESTS TABLE
-- =====================================================
CREATE TABLE public.guests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  guest_name TEXT NOT NULL,
  games_played INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  first_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Stats tracking
  cricket_games_played INTEGER DEFAULT 0,
  cricket_games_won INTEGER DEFAULT 0,
  cricket_total_mpr DECIMAL DEFAULT 0,
  golf_games_played INTEGER DEFAULT 0,
  golf_games_won INTEGER DEFAULT 0,
  golf_total_score INTEGER DEFAULT 0,
  extra_games_played INTEGER DEFAULT 0,
  extra_games_won INTEGER DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Guests policies
CREATE POLICY "Guests viewable by venue owner"
  ON public.guests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.venues WHERE id = venue_id AND owner_id = auth.uid())
  );

CREATE POLICY "Venue owners can manage guests"
  ON public.guests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.venues WHERE id = venue_id AND owner_id = auth.uid())
  );

-- =====================================================
-- GAMES TABLE
-- =====================================================
CREATE TABLE public.games (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_mode game_mode NOT NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL, -- NULL if played at home
  session_id UUID REFERENCES public.venue_sessions(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  players JSONB NOT NULL, -- Array of player objects with IDs and stats
  game_data JSONB NOT NULL, -- Full game state/results
  play_mode TEXT, -- 'practice', 'casual', 'league'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Create index for faster queries
CREATE INDEX games_venue_id_idx ON public.games(venue_id);
CREATE INDEX games_created_at_idx ON public.games(created_at DESC);
CREATE INDEX games_game_mode_idx ON public.games(game_mode);

-- Enable Row Level Security
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Games policies
CREATE POLICY "Games viewable by participants"
  ON public.games FOR SELECT
  USING (
    -- Players can see their own games
    players::text LIKE '%' || auth.uid()::text || '%' OR
    -- Venue owners can see games at their venue
    EXISTS (SELECT 1 FROM public.venues WHERE id = venue_id AND owner_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create games"
  ON public.games FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- PLAYER STATS TABLE (aggregated from games)
-- =====================================================
CREATE TABLE public.player_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Overall stats
  total_games_played INTEGER DEFAULT 0,
  total_games_won INTEGER DEFAULT 0,

  -- Cricket stats
  cricket_games_played INTEGER DEFAULT 0,
  cricket_games_won INTEGER DEFAULT 0,
  cricket_total_mpr DECIMAL DEFAULT 0,
  cricket_average_mpr DECIMAL DEFAULT 0,

  -- Golf stats
  golf_games_played INTEGER DEFAULT 0,
  golf_games_won INTEGER DEFAULT 0,
  golf_total_score INTEGER DEFAULT 0,
  golf_average_score DECIMAL DEFAULT 0,
  golf_best_score INTEGER,
  golf_tiebreaker_wins INTEGER DEFAULT 0,

  -- Extra games stats
  extra_games_played INTEGER DEFAULT 0,
  extra_games_won INTEGER DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- Player stats policies
CREATE POLICY "Stats viewable by everyone"
  ON public.player_stats FOR SELECT
  USING (true);

CREATE POLICY "System can update stats"
  ON public.player_stats FOR ALL
  USING (true);

-- =====================================================
-- FRIENDS TABLE (for future social features)
-- =====================================================
CREATE TABLE public.friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, friend_id)
);

-- Enable Row Level Security
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Friendships policies
CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own friendships"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_stats_updated_at BEFORE UPDATE ON public.player_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), ' ', '-'))
  );

  -- Create initial stats entry
  INSERT INTO public.player_stats (player_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to automatically expire sessions
CREATE OR REPLACE FUNCTION public.expire_old_sessions()
RETURNS void AS $$
BEGIN
  UPDATE public.venue_sessions
  SET status = 'expired'
  WHERE status = 'active'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
