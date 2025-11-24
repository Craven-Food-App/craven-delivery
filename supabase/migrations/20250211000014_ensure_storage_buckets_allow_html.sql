-- Ensure storage buckets allow HTML files for document generation
-- This migration ensures HTML files can be uploaded even if previous migrations failed

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'text/html', 'image/png', 'image/jpeg']
WHERE id = 'governance-certificates';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'text/html']
WHERE id = 'governance-resolutions';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'text/html']
WHERE id = 'contracts-executives';

-- If buckets don't exist yet, create them with HTML support
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('governance-certificates', 'governance-certificates', false, 5242880, ARRAY['application/pdf', 'text/html', 'image/png', 'image/jpeg']),
  ('governance-resolutions', 'governance-resolutions', false, 10485760, ARRAY['application/pdf', 'text/html']),
  ('contracts-executives', 'contracts-executives', false, 10485760, ARRAY['application/pdf', 'text/html'])
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types;




