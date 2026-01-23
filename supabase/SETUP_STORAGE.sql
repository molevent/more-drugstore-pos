-- ============================================================================
-- STORAGE BUCKET SETUP FOR PRODUCT IMAGES
-- Run this in Supabase SQL Editor to enable image uploads
-- ============================================================================

-- Note: Storage buckets cannot be created via SQL in Supabase
-- You must create the bucket manually in the Supabase Dashboard
-- This script only sets up the policies

-- ============================================================================
-- STEP 1: Create the bucket manually in Supabase Dashboard
-- ============================================================================
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Name: products
-- 4. Public bucket: YES (checked)
-- 5. Click "Create bucket"

-- ============================================================================
-- STEP 2: Run this SQL to set up storage policies
-- ============================================================================

-- Policy 1: Allow authenticated users to upload images
INSERT INTO storage.policies (name, bucket_id, definition, check_definition)
VALUES (
  'Allow authenticated uploads',
  'products',
  '(bucket_id = ''products''::text)',
  '(auth.role() = ''authenticated''::text)'
)
ON CONFLICT DO NOTHING;

-- Policy 2: Allow public read access to images
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Public read access',
  'products',
  '(bucket_id = ''products''::text)'
)
ON CONFLICT DO NOTHING;

-- Policy 3: Allow authenticated users to update their uploads
INSERT INTO storage.policies (name, bucket_id, definition, check_definition)
VALUES (
  'Allow authenticated updates',
  'products',
  '(bucket_id = ''products''::text)',
  '(auth.role() = ''authenticated''::text)'
)
ON CONFLICT DO NOTHING;

-- Policy 4: Allow authenticated users to delete their uploads
INSERT INTO storage.policies (name, bucket_id, definition, check_definition)
VALUES (
  'Allow authenticated deletes',
  'products',
  '(bucket_id = ''products''::text)',
  '(auth.role() = ''authenticated''::text)'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to check if policies are created:
SELECT * FROM storage.policies WHERE bucket_id = 'products';

-- ============================================================================
-- DONE!
-- ============================================================================
-- Now you can upload images from the Products page
