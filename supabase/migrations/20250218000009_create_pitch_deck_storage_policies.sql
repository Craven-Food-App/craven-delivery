-- Create RLS policies for Pitch Deck storage buckets
-- Run this AFTER creating the buckets manually in Supabase Dashboard
-- (See SETUP-PITCH-DECK-STORAGE.md for instructions)

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

