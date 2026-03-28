-- Allow recipients to read attachment objects in internal-comms-files.
-- Implemented via STABLE helper so the storage.objects policy does not reference
-- storage.objects.name inside its own USING (avoids Postgres 42P17).

CREATE OR REPLACE FUNCTION public.internal_comms_storage_object_readable(object_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.internal_message_attachments att
    JOIN public.internal_messages m ON m.id = att.message_id
    WHERE att.file_url = object_path
      AND (
        m.sender_id = (SELECT auth.uid())
        OR (SELECT auth.uid()) = ANY (m.recipient_ids)
        OR EXISTS (
          WITH RECURSIVE ancestors AS (
            SELECT id, parent_id, sender_id, recipient_ids
            FROM public.internal_messages
            WHERE id = m.id
            UNION ALL
            SELECT p.id, p.parent_id, p.sender_id, p.recipient_ids
            FROM public.internal_messages p
            INNER JOIN ancestors a ON p.id = a.parent_id
          )
          SELECT 1
          FROM ancestors u
          WHERE u.parent_id IS NULL
            AND (
              u.sender_id = (SELECT auth.uid())
              OR (SELECT auth.uid()) = ANY (u.recipient_ids)
            )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.internal_comms_storage_object_readable(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_comms_storage_object_readable(text) TO authenticated;

DROP POLICY IF EXISTS "internal_comms_participant_read_storage" ON storage.objects;

CREATE POLICY "internal_comms_participant_read_storage"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'internal-comms-files'
  AND public.internal_comms_storage_object_readable(name)
);
