-- Replace recursive SQL helper with bounded plpgsql to avoid storage SELECT 500s
-- (cycles / deep threads / planner quirks with RECURSIVE inside policy helpers).
-- Restrict internal-comms-files reads to thread participants only by dropping the
-- legacy permissive read policies that granted any authenticated user full bucket read.

CREATE OR REPLACE FUNCTION public.internal_comms_storage_object_readable(object_path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  uid uuid := auth.uid();
  mid uuid;
  cur_id uuid;
  cur_parent uuid;
  cur_sender uuid;
  cur_recipients uuid[];
  depth int := 0;
  normalized_path text;
  visited uuid[] := ARRAY[]::uuid[];
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  normalized_path := nullif(btrim(object_path), '');
  IF normalized_path IS NULL THEN
    RETURN false;
  END IF;

  SELECT m.id
  INTO mid
  FROM public.internal_message_attachments att
  JOIN public.internal_messages m ON m.id = att.message_id
  WHERE att.file_url = normalized_path
  LIMIT 1;

  IF mid IS NULL THEN
    RETURN false;
  END IF;

  cur_id := mid;

  LOOP
    IF depth > 100 THEN
      RETURN false;
    END IF;
    depth := depth + 1;

    IF cur_id = ANY (visited) THEN
      RETURN false;
    END IF;
    visited := array_append(visited, cur_id);

    SELECT parent_id, sender_id, recipient_ids
    INTO cur_parent, cur_sender, cur_recipients
    FROM public.internal_messages
    WHERE id = cur_id;

    IF NOT FOUND THEN
      RETURN false;
    END IF;

    IF cur_sender = uid OR uid = ANY (COALESCE(cur_recipients, ARRAY[]::uuid[])) THEN
      RETURN true;
    END IF;

    IF cur_parent IS NULL THEN
      RETURN false;
    END IF;

    cur_id := cur_parent;
  END LOOP;
END;
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

DROP POLICY IF EXISTS "Authenticated can read comms files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read comms files" ON storage.objects;
