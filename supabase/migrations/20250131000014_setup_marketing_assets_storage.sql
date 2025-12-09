-- Setup Storage Bucket and Policies for Marketing Assets
-- This creates the bucket and sets up RLS policies if they don't exist

-- Create the storage bucket (if it doesn't exist)
-- Note: Bucket creation via SQL requires superuser privileges
-- If this fails, create the bucket manually in Supabase Dashboard → Storage

-- Insert bucket into storage.buckets (only if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-assets',
  'marketing-assets',
  true, -- Public bucket
  10485760, -- 10MB limit
  ARRAY['image/*', 'video/*', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Authenticated users can upload marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete marketing assets" ON storage.objects;

-- Allow authenticated users to upload to marketing-assets bucket
-- More permissive: allows any authenticated user (can be restricted later)
CREATE POLICY "Authenticated users can upload marketing assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marketing-assets');

-- Allow authenticated users to read from marketing-assets bucket
CREATE POLICY "Authenticated users can read marketing assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'marketing-assets');

-- Allow authenticated users to update files in marketing-assets bucket
CREATE POLICY "Authenticated users can update marketing assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'marketing-assets');

-- Allow authenticated users to delete from marketing-assets bucket
CREATE POLICY "Authenticated users can delete marketing assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'marketing-assets');

