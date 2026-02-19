-- Add username column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT;

-- Create unique index for username
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON public.users(username) WHERE username IS NOT NULL;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
