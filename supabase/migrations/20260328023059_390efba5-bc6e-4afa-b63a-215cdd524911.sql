-- Drop the overly restrictive storage policy that's causing 500 errors
DROP POLICY IF EXISTS "internal_comms_participant_read_storage" ON storage.objects;

-- Drop the function that was causing issues
DROP FUNCTION IF EXISTS public.internal_comms_storage_object_readable(text);

-- Simple policy: any authenticated user can read from internal-comms-files
CREATE POLICY "Authenticated users can read comms files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'internal-comms-files');

-- Ensure upload policy exists
DROP POLICY IF EXISTS "Authenticated users can upload comms files" ON storage.objects;
CREATE POLICY "Authenticated users can upload comms files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'internal-comms-files');