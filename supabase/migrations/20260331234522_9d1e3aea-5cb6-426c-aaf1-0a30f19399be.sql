-- Keep Internal Comms attachments private while still allowing authorized thread participants to access them.

UPDATE storage.buckets
SET public = false
WHERE id = 'internal-comms-files';

CREATE OR REPLACE FUNCTION public.internal_comms_storage_object_readable(object_path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  normalized_path text := nullif(btrim(object_path), '');
BEGIN
  IF uid IS NULL OR normalized_path IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.internal_message_attachments att
    JOIN public.internal_messages m
      ON m.id = att.message_id
    LEFT JOIN public.internal_messages tr
      ON tr.id = COALESCE(m.thread_root_id, m.id)
    WHERE (
      att.file_url = normalized_path
      OR split_part(split_part(att.file_url, '/internal-comms-files/', 2), '?', 1) = normalized_path
    )
      AND (
        m.sender_id = uid
        OR uid = ANY(COALESCE(m.recipient_ids, ARRAY[]::uuid[]))
        OR COALESCE(tr.sender_id, m.sender_id) = uid
        OR uid = ANY(COALESCE(tr.recipient_ids, ARRAY[]::uuid[]))
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.internal_comms_storage_object_readable(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_comms_storage_object_readable(text) TO authenticated;

DROP POLICY IF EXISTS "internal_comms_participant_read_storage" ON storage.objects;
CREATE POLICY "internal_comms_participant_read_storage"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'internal-comms-files'
  AND public.internal_comms_storage_object_readable(name)
);

DROP POLICY IF EXISTS "Authenticated can read comms files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read comms files" ON storage.objects;