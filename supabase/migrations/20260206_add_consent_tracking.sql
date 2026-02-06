-- Add consent tracking fields to profiles table
-- For GDPR and privacy law compliance

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN profiles.terms_accepted_at IS 'Timestamp when user agreed to Terms of Service and Privacy Policy';
COMMENT ON COLUMN profiles.marketing_consent IS 'Whether user consented to receive marketing emails and newsletters';
COMMENT ON COLUMN profiles.marketing_consent_at IS 'Timestamp when user gave or updated marketing consent';

-- Create index for querying marketing consent users
CREATE INDEX IF NOT EXISTS idx_profiles_marketing_consent
ON profiles(marketing_consent)
WHERE marketing_consent = TRUE;
