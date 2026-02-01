-- Add Admin Flag to Profiles
-- Created: 2026-01-26
-- Purpose: Allow specific users to access admin dashboard

-- Add is_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for quick admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- Update your profile to be admin (replace with your actual email)
-- You'll need to run this manually with your email:
-- UPDATE profiles SET is_admin = true WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

COMMENT ON COLUMN profiles.is_admin IS 'Flag indicating if user has admin dashboard access';
