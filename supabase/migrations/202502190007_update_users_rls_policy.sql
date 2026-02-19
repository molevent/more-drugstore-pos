-- Update RLS policies for users table to allow admin/owner to create users

-- First, drop existing insert policy if it exists
DROP POLICY IF EXISTS "Allow admins to insert users" ON public.users;

-- Create new policy to allow owner/admin to insert users
CREATE POLICY "Allow owner/admin to insert users" 
ON public.users 
FOR INSERT 
TO authenticated 
WITH CHECK (
  -- Allow if the user has owner or admin role
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Also update the select policy to allow users to see all users (needed for user management)
DROP POLICY IF EXISTS "Allow users to select own profile" ON public.users;
DROP POLICY IF EXISTS "Allow users to select users" ON public.users;

CREATE POLICY "Allow authenticated to select users" 
ON public.users 
FOR SELECT 
TO authenticated 
USING (true);

-- Update policy to allow owner/admin to update any user
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow owner to update users" ON public.users;

CREATE POLICY "Allow owner/admin to update users" 
ON public.users 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
