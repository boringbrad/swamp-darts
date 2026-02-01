-- Fix search_path for all SECURITY DEFINER functions to prevent potential security issues
-- This addresses the "Function Search Path Mutable" warnings from Supabase Security Advisor

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- Fix handle_new_user function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Fix expire_old_sessions function
CREATE OR REPLACE FUNCTION public.expire_old_sessions()
RETURNS void AS $$
BEGIN
  UPDATE public.venue_sessions
  SET status = 'expired'
  WHERE status = 'active'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- Fix update_friendships_updated_at function (if it exists from migration 07)
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- Fix update_user_presence function
CREATE OR REPLACE FUNCTION public.update_user_presence()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET last_seen_at = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
