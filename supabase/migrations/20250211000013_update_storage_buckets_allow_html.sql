-- Update storage buckets to allow HTML files for document generation
-- The document generation function creates HTML files that need to be stored

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'text/html', 'image/png', 'image/jpeg']
WHERE id = 'governance-certificates';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'text/html']
WHERE id = 'governance-resolutions';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'text/html']
WHERE id = 'contracts-executives';





