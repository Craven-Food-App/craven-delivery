-- Create RLS policies for Pitch Deck storage buckets
-- 
-- IMPORTANT: You must create the storage buckets manually FIRST in Supabase Dashboard:
-- 1. Go to Storage → New bucket
-- 2. Create "pitch-deck-assets" (Public, 10MB limit, allow images and PDFs)
-- 3. Create "pitch-deck-videos" (Public, 50MB limit, allow video files)
-- 
-- See SETUP-PITCH-DECK-STORAGE.md for detailed instructions.
--
-- This migration ONLY creates the RLS policies (assumes buckets already exist).

-- Public read access for pitch-deck-assets
DROP POLICY IF EXISTS "Public read access for pitch-deck-assets" ON storage.objects;
CREATE POLICY "Public read access for pitch-deck-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pitch-deck-assets');

-- Public read access for pitch-deck-videos
DROP POLICY IF EXISTS "Public read access for pitch-deck-videos" ON storage.objects;
CREATE POLICY "Public read access for pitch-deck-videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pitch-deck-videos');

-- Admins can upload to pitch-deck-assets
DROP POLICY IF EXISTS "Admins can upload to pitch-deck-assets" ON storage.objects;
CREATE POLICY "Admins can upload to pitch-deck-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pitch-deck-assets' AND
    auth.role() = 'authenticated' AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CEO'))
    )
  );

-- Admins can update pitch-deck-assets
DROP POLICY IF EXISTS "Admins can update pitch-deck-assets" ON storage.objects;
CREATE POLICY "Admins can update pitch-deck-assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pitch-deck-assets' AND
    auth.role() = 'authenticated' AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CEO'))
    )
  );

-- Admins can delete pitch-deck-assets
DROP POLICY IF EXISTS "Admins can delete pitch-deck-assets" ON storage.objects;
CREATE POLICY "Admins can delete pitch-deck-assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pitch-deck-assets' AND
    auth.role() = 'authenticated' AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CEO'))
    )
  );

-- Admins can upload to pitch-deck-videos
DROP POLICY IF EXISTS "Admins can upload to pitch-deck-videos" ON storage.objects;
CREATE POLICY "Admins can upload to pitch-deck-videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pitch-deck-videos' AND
    auth.role() = 'authenticated' AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CEO'))
    )
  );

-- Admins can update pitch-deck-videos
DROP POLICY IF EXISTS "Admins can update pitch-deck-videos" ON storage.objects;
CREATE POLICY "Admins can update pitch-deck-videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pitch-deck-videos' AND
    auth.role() = 'authenticated' AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CEO'))
    )
  );

-- Admins can delete pitch-deck-videos
DROP POLICY IF EXISTS "Admins can delete pitch-deck-videos" ON storage.objects;
CREATE POLICY "Admins can delete pitch-deck-videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pitch-deck-videos' AND
    auth.role() = 'authenticated' AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CEO'))
    )
  );
