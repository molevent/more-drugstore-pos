-- Add language preference to users table
-- Migration: 004_add_language_preference
-- Created: 2026-01-22

-- Add language column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'th' CHECK (language IN ('th', 'en'));

-- Update existing users to have Thai as default
UPDATE public.users 
SET language = 'th' 
WHERE language IS NULL;

-- Add comment
COMMENT ON COLUMN public.users.language IS 'User interface language preference (th=Thai, en=English)';
