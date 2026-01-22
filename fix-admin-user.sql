-- Fix Admin User Profile
-- Run this in Supabase SQL Editor

-- First, check if user profile exists
SELECT * FROM public.users WHERE id = 'dbc2fc5e-45c9-4541-820b-2cc95e998acf';

-- If the above returns no rows, insert the user profile:
INSERT INTO public.users (id, email, full_name, role, is_active)
VALUES (
  'dbc2fc5e-45c9-4541-820b-2cc95e998acf',
  'admin@moredrug.com',
  'Admin User',
  'admin',
  true
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Verify the user was created
SELECT * FROM public.users WHERE id = 'dbc2fc5e-45c9-4541-820b-2cc95e998acf';
