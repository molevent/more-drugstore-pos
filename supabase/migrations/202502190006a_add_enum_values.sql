-- Step 1: Add new enum values (run this first, then commit)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'part_time';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'accountant';

-- Step 2: Add username column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON public.users(username) WHERE username IS NOT NULL;

-- NOTE: After running this query successfully, you need to run a SECOND query to update existing admin roles:
-- UPDATE public.users SET role = 'owner' WHERE role = 'admin';
