-- ============================================
-- STEP 1: Diagnose Current Storage State
-- ============================================

-- Check if bucket exists and its config
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'learnshift';

-- Check all policies on storage.objects
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage';

-- Check if RLS is enabled on storage.objects
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'objects';

-- Count existing files
SELECT count(*) as total_files
FROM storage.objects 
WHERE bucket_id = 'learnshift';

-- ============================================
-- STEP 2: Fix RLS Policies (if needed)
-- ============================================
-- Run this ONLY if the policies above show restrictive conditions
-- like "auth.uid() = owner" which blocks Laravel S3 uploads

-- Drop restrictive policies
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete own files" ON storage.objects;

-- Create permissive policies for the learnshift bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'learnshift'
  );

CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'learnshift'
  );

CREATE POLICY "Allow authenticated delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'learnshift'
    AND auth.role() = 'authenticated'
  );