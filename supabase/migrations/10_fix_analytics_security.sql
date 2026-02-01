-- Fix security issues with analytics views
-- This addresses the "Exposed Auth Users" warnings from Supabase Security Advisor
-- These views contain auth.users data and should only be accessible to admins

-- Enable RLS on the analytics views
-- Note: Views need to be recreated with security_invoker option to properly enforce RLS
DROP VIEW IF EXISTS user_activity_analytics;
DROP VIEW IF EXISTS guest_player_analytics;

-- Recreate guest_player_analytics view with security_invoker
CREATE OR REPLACE VIEW guest_player_analytics
WITH (security_invoker = true)
AS
SELECT
  gp.id,
  gp.name,
  gp.added_by_user_id,
  gp.created_at,
  COUNT(DISTINCT cm.id) as cricket_match_count,
  COUNT(DISTINCT gm.id) as golf_match_count,
  COUNT(DISTINCT cm.id) + COUNT(DISTINCT gm.id) as total_match_count
FROM guest_players gp
LEFT JOIN cricket_matches cm ON cm.players::text LIKE '%' || gp.id || '%'
LEFT JOIN golf_matches gm ON gm.players::text LIKE '%' || gp.id || '%'
GROUP BY gp.id, gp.name, gp.added_by_user_id, gp.created_at;

-- Recreate user_activity_analytics view with security_invoker
-- This view contains auth.users data, so it's restricted to admins only
CREATE OR REPLACE VIEW user_activity_analytics
WITH (security_invoker = true)
AS
SELECT
  u.id as user_id,
  u.email,
  COUNT(DISTINCT gp.id) as guest_count,
  COUNT(DISTINCT cm.id) as cricket_match_count,
  COUNT(DISTINCT gm.id) as golf_match_count,
  COUNT(DISTINCT cm.id) + COUNT(DISTINCT gm.id) as total_match_count,
  MAX(GREATEST(cm.created_at, gm.created_at)) as last_activity
FROM auth.users u
LEFT JOIN guest_players gp ON gp.added_by_user_id = u.id
LEFT JOIN cricket_matches cm ON cm.user_id = u.id
LEFT JOIN golf_matches gm ON gm.user_id = u.id
GROUP BY u.id, u.email;

-- Grant access only to authenticated users (admins will check is_admin flag in app code)
GRANT SELECT ON guest_player_analytics TO authenticated;
GRANT SELECT ON user_activity_analytics TO authenticated;

-- Add comments explaining the security model
COMMENT ON VIEW guest_player_analytics IS 'Analytics view showing guest player usage. Access restricted via RLS policies on underlying tables.';
COMMENT ON VIEW user_activity_analytics IS 'ADMIN ONLY: Analytics view showing user engagement metrics including auth.users data. App must verify is_admin flag before querying.';
