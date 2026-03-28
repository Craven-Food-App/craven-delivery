-- Harden internal_comms_storage_object_readable: match attachment rows when file_url is
-- a plain storage path (current clients) or a full URL / path variant (legacy or other UIs).
-- Also pin search_path (incl. pg_temp) to reduce odd policy-evaluation failures.

CREATE OR REPLACE FUNCTION public.internal_comms_storage_object_readable(object_path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  uid uuid;
  mid uuid;
  cur_id uuid;
  cur_parent uuid;
  cur_sender uuid;
  cur_recipients uuid[];
  depth int := 0;
  normalized_path text;
  norm_len int;
  visited uuid[] := ARRAY[]::uuid[];
BEGIN
  uid := (SELECT auth.uid());
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  normalized_path := nullif(btrim(object_path), '');
  IF normalized_path IS NULL THEN
    RETURN false;
  END IF;

  norm_len := char_length(normalized_path);

  SELECT m.id
  INTO mid
  FROM public.internal_message_attachments att
  JOIN public.internal_messages m ON m.id = att.message_id
  WHERE att.file_url = normalized_path
     OR (
       position('/' in normalized_path) > 0
       AND right(regexp_replace(att.file_url, E'\\', '/', 'g'), norm_len) = normalized_path
     )
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
