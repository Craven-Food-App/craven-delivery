
-- Create the internal-comms-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('internal-comms-files', 'internal-comms-files', false, 10485760, NULL)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload comms files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'internal-comms-files');

-- Allow authenticated users to read comms files
CREATE POLICY "Authenticated users can read comms files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'internal-comms-files');

-- Allow users to delete their own comms files
CREATE POLICY "Users can delete own comms files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'internal-comms-files' AND (storage.foldername(name))[1] = auth.uid()::text);
