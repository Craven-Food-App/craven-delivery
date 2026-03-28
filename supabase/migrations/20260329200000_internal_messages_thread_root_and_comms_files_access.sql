-- Thread-scoped access for internal DM attachments and Storage objects.
-- Adds thread_root_id so authorization is a simple join (no recursive CTE / fragile
-- plpgsql in storage policies). Fixes recipients who are on the thread root but not
-- listed on every reply row, and avoids storage SELECT 500s from policy evaluation.

-- 1) Column + backfill + trigger
-- (No FK to internal_messages(id): root rows use thread_root_id = id on the same INSERT; a self-FK would fail.)
ALTER TABLE public.internal_messages
  ADD COLUMN IF NOT EXISTS thread_root_id uuid;

-- Walk from each root down; every row gets the root id as thread_root_id.
WITH RECURSIVE tree AS (
  SELECT id, parent_id, id AS computed_root
  FROM public.internal_messages
  WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.parent_id, tree.computed_root
  FROM public.internal_messages c
  INNER JOIN tree ON c.parent_id = tree.id
)
UPDATE public.internal_messages m
SET thread_root_id = tree.computed_root
FROM tree
WHERE m.id = tree.id;

-- Orphans / bad parent links: treat each row as its own thread.
UPDATE public.internal_messages
SET thread_root_id = id
WHERE thread_root_id IS NULL;

ALTER TABLE public.internal_messages
  ALTER COLUMN thread_root_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_internal_messages_thread_root_id
  ON public.internal_messages(thread_root_id);

CREATE OR REPLACE FUNCTION public.internal_messages_set_thread_root()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.thread_root_id := NEW.id;
  ELSE
    SELECT COALESCE(tr.thread_root_id, tr.id)
    INTO NEW.thread_root_id
    FROM public.internal_messages tr
    WHERE tr.id = NEW.parent_id;

    IF NEW.thread_root_id IS NULL THEN
      NEW.thread_root_id := NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS internal_messages_thread_root_ins ON public.internal_messages;
CREATE TRIGGER internal_messages_thread_root_ins
  BEFORE INSERT ON public.internal_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.internal_messages_set_thread_root();

-- 2) Storage: simple SQL helper (no recursion, no row_security toggle)
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
    INNER JOIN public.internal_messages m ON m.id = att.message_id
    INNER JOIN public.internal_messages tr ON tr.id = m.thread_root_id
    WHERE (
      att.file_url = btrim(object_path)
      OR (
        position('/' IN btrim(object_path)) > 0
        AND right(regexp_replace(att.file_url, E'\\', '/', 'g'), char_length(btrim(object_path))) = btrim(object_path)
      )
    )
    AND (
      (SELECT auth.uid()) = m.sender_id
      OR (SELECT auth.uid()) = ANY (COALESCE(m.recipient_ids, ARRAY[]::uuid[]))
      OR (SELECT auth.uid()) = tr.sender_id
      OR (SELECT auth.uid()) = ANY (COALESCE(tr.recipient_ids, ARRAY[]::uuid[]))
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

-- Keep bucket locked down (no blanket authenticated read).
DROP POLICY IF EXISTS "Authenticated can read comms files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read comms files" ON storage.objects;

-- 3) Attachments: allow read if participant on the message OR on the thread root
DROP POLICY IF EXISTS "Users can read attachments for their messages" ON public.internal_message_attachments;

CREATE POLICY "Users can read attachments for their messages"
ON public.internal_message_attachments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.internal_messages m
    INNER JOIN public.internal_messages tr ON tr.id = m.thread_root_id
    WHERE m.id = internal_message_attachments.message_id
      AND (
        m.sender_id = (SELECT auth.uid())
        OR (SELECT auth.uid()) = ANY (COALESCE(m.recipient_ids, ARRAY[]::uuid[]))
        OR tr.sender_id = (SELECT auth.uid())
        OR (SELECT auth.uid()) = ANY (COALESCE(tr.recipient_ids, ARRAY[]::uuid[]))
      )
  )
);

-- 4) Messages: allow reading any row in a thread if you are on the thread root (sender/recipient)
DROP POLICY IF EXISTS "Users can read their messages" ON public.internal_messages;

CREATE POLICY "Users can read their messages"
ON public.internal_messages FOR SELECT TO authenticated
USING (
  sender_id = (SELECT auth.uid())
  OR (SELECT auth.uid()) = ANY (recipient_ids)
  OR EXISTS (
    SELECT 1
    FROM public.internal_messages tr
    WHERE tr.id = internal_messages.thread_root_id
      AND (
        tr.sender_id = (SELECT auth.uid())
        OR (SELECT auth.uid()) = ANY (COALESCE(tr.recipient_ids, ARRAY[]::uuid[]))
      )
  )
);
