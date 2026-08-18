-- Native Hub notifications consume INSERT events for announcements and tasks.
-- internal_messages was already added to supabase_realtime in an earlier
-- migration; these two tables had client subscriptions but no publication.

ALTER TABLE public.internal_announcements REPLICA IDENTITY FULL;
ALTER TABLE public.internal_tasks REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'internal_announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_announcements;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'internal_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_tasks;
  END IF;
END
$$;
