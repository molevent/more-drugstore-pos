-- ============================================================================
-- FIX STORAGE POLICIES - Correct version for Supabase Storage
-- Run this in Supabase SQL Editor
-- ============================================================================

-- The previous SQL was incorrect. Storage policies in Supabase work differently.
-- We need to create policies on storage.objects table, not insert into storage.policies

-- ============================================================================
-- STEP 1: Drop old policies if they exist
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- ============================================================================
-- STEP 2: Create correct storage policies
-- ============================================================================

-- Policy 1: Allow anyone to read/view images (public access)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

-- Policy 2: Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

-- Policy 3: Allow authenticated users to update images
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- Policy 4: Allow authenticated users to delete images
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');

-- ============================================================================
-- STEP 3: Verify policies are created
-- ============================================================================
-- Run this to check:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';

-- ============================================================================
-- DONE!
-- ============================================================================
-- Now try uploading an image again. It should work!
