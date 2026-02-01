-- Check if profiles table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    CREATE TABLE public.profiles (
      id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      username TEXT UNIQUE,
      avatar TEXT,
      photo_url TEXT,
      account_type account_type DEFAULT 'player' NOT NULL,
      is_venue_approved BOOLEAN DEFAULT false,
      venue_approval_requested_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Public profiles are viewable by everyone"
      ON public.profiles FOR SELECT
      USING (true);

    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END $$;

-- Check if player_stats table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'player_stats') THEN
    CREATE TABLE public.player_stats (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
      total_games_played INTEGER DEFAULT 0,
      total_games_won INTEGER DEFAULT 0,
      cricket_games_played INTEGER DEFAULT 0,
      cricket_games_won INTEGER DEFAULT 0,
      cricket_total_mpr DECIMAL DEFAULT 0,
      cricket_average_mpr DECIMAL DEFAULT 0,
      golf_games_played INTEGER DEFAULT 0,
      golf_games_won INTEGER DEFAULT 0,
      golf_total_score INTEGER DEFAULT 0,
      golf_average_score DECIMAL DEFAULT 0,
      golf_best_score INTEGER,
      golf_tiebreaker_wins INTEGER DEFAULT 0,
      extra_games_played INTEGER DEFAULT 0,
      extra_games_won INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Stats viewable by everyone"
      ON public.player_stats FOR SELECT
      USING (true);

    CREATE POLICY "System can update stats"
      ON public.player_stats FOR ALL
      USING (true);
  END IF;
END $$;

-- Create or replace the handle_new_user function (most critical part)
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

-- Drop and recreate the trigger to ensure it's properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
