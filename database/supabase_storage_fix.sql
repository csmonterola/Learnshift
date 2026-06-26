-- ============================================
-- Fix Supabase Storage Blocking Issue
-- This fixes the "file_path = 0" or UnableToWriteFile problem
-- ============================================

-- Step 1: Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('learnshift', 'learnshift', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop existing policies (if any)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to learnshift" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from learnshift" ON storage.objects;
DROP POLICY IF EXISTS "Allow service deletes" ON storage.objects;

-- Step 3: Create permissive policies
-- Laravel S3 driver uses service_role credentials but doesn't set owner/auth.uid
-- So we only check bucket_id for inserts, not user ownership
CREATE POLICY "Allow uploads to learnshift" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'learnshift'
  );

CREATE POLICY "Allow public reads from learnshift" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'learnshift'
  );

CREATE POLICY "Allow service deletes" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'learnshift'
  );
