-- Add last_seen_at column to profiles for online status tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster online status queries
CREATE INDEX IF NOT EXISTS profiles_last_seen_at_idx ON public.profiles(last_seen_at DESC);

-- Update existing users to have current timestamp
UPDATE public.profiles
SET last_seen_at = NOW()
WHERE last_seen_at IS NULL;

-- Function to update user presence
CREATE OR REPLACE FUNCTION public.update_user_presence()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET last_seen_at = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_presence() TO authenticated;
