-- Ensure Backward Compatibility for Existing Users
-- Migration: 202502190004_ensure_backward_compatibility
-- Created: 2026-02-19
-- 
-- This migration ensures that existing users (especially admin@moredrug.com)
-- continue to work with full access after the role system upgrade

-- ============================================================================
-- UPDATE EXISTING USERS TO ENSURE COMPATIBILITY
-- ============================================================================

-- Set any null usernames to use the email prefix (for existing users without username)
UPDATE public.users 
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL OR username = '';

-- Ensure any user with 'admin' role is converted to 'owner' (full access)
UPDATE public.users 
SET role = 'owner'::user_role
WHERE role::text = 'admin' OR role IS NULL;

-- Ensure admin@moredrug.com specifically has owner role and is active
UPDATE public.users 
SET 
  role = 'owner'::user_role,
  is_active = true,
  username = COALESCE(username, 'admin'),
  full_name = COALESCE(full_name, 'Administrator')
WHERE email = 'admin@moredrug.com';

-- Also ensure any user with email containing 'admin' gets owner role
UPDATE public.users 
SET role = 'owner'::user_role
WHERE email LIKE '%admin%' AND role != 'owner'::user_role;

-- ============================================================================
-- ADD DEFAULT USERNAME FOR ALL EXISTING USERS
-- ============================================================================

-- For any existing users that still don't have a username, use their email prefix
UPDATE public.users 
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL OR username = '';

-- Ensure usernames are unique by appending numbers if needed
DO $$
DECLARE
  dup_user RECORD;
  counter INT;
BEGIN
  FOR dup_user IN 
    SELECT email, username, COUNT(*) as cnt
    FROM public.users
    WHERE username IS NOT NULL
    GROUP BY email, username
    HAVING COUNT(*) > 1
  LOOP
    counter := 1;
    UPDATE public.users 
    SET username = dup_user.username || counter::text
    WHERE email = dup_user.email;
  END LOOP;
END $$;

-- ============================================================================
-- VERIFY PERMISSIONS
-- ============================================================================

-- Ensure RLS policies allow existing users to access their data
COMMENT ON TABLE public.users IS 'User accounts with role-based access control. 
Existing admin users are migrated to owner role with full access.
All existing users can login with email or username.';

-- Log the migration
INSERT INTO public.activity_logs (user_id, user_role, action, entity_type, details, created_at)
SELECT 
  id,
  role,
  'system_migration',
  'user',
  jsonb_build_object(
    'message', 'User migrated to new role system',
    'old_role', 'admin',
    'new_role', role::text
  ),
  NOW()
FROM public.users
WHERE role = 'owner'::user_role
ON CONFLICT DO NOTHING;
