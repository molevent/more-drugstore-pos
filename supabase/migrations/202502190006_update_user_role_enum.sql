-- Update user_role enum to include new roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'part_time';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'accountant';

-- If the above doesn't work (enum already exists with different values), 
-- we need to recreate the enum (this is more complex and requires data migration)
-- For now, let's try the simple approach first

-- Also ensure username column exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT;

-- Create unique index for username
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON public.users(username) WHERE username IS NOT NULL;

-- Update existing 'admin' roles to 'owner' for backward compatibility
UPDATE public.users SET role = 'owner' WHERE role = 'admin';
