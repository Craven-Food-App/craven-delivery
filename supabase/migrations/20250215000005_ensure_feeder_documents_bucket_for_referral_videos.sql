-- Ensure feeder-documents bucket exists and supports referral videos
-- This migration ensures the bucket exists and has proper policies for admin/marketing users
-- to upload referral videos

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feeder-documents',
  'feeder-documents',
  false,
  104857600, -- 100MB limit for videos
  ARRAY['video/mp4', 'video/webm', 'video/mov', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/mov', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Drop existing policies that might conflict (we'll recreate them)
DROP POLICY IF EXISTS "Admins can upload referral videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view referral videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete referral videos" ON storage.objects;

-- Policy: Admins and marketing users can upload referral videos
CREATE POLICY "Admins can upload referral videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'feeder-documents' AND
  (name LIKE 'referral-videos/%' OR name LIKE 'referral-thumbnails/%') AND
  (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  )
);

-- Policy: Admins and marketing users can view referral videos
CREATE POLICY "Admins can view referral videos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'feeder-documents' AND
  (name LIKE 'referral-videos/%' OR name LIKE 'referral-thumbnails/%') AND
  (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  )
);

-- Policy: Admins and marketing users can delete referral videos
CREATE POLICY "Admins can delete referral videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'feeder-documents' AND
  (name LIKE 'referral-videos/%' OR name LIKE 'referral-thumbnails/%') AND
  (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  )
);

-- Policy: Public can view referral videos (for displaying on referral pages)
CREATE POLICY "Public can view referral videos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'feeder-documents' AND
  (name LIKE 'referral-videos/%' OR name LIKE 'referral-thumbnails/%')
);

