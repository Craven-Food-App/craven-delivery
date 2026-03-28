-- Fix storage policy recursion caused by querying executive_shared_calendar_members under RLS

CREATE OR REPLACE FUNCTION public.exec_can_read_calendar_storage(_object_name text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.executive_calendar_event_attachments att
    JOIN public.executive_calendar_events e ON e.id = att.event_id
    WHERE att.storage_path = _object_name
      AND (
        e.created_by = _user_id
        OR e.visibility = 'executives'
        OR EXISTS (
          SELECT 1
          FROM public.executive_calendar_event_invites i
          WHERE i.event_id = e.id
            AND i.user_id = _user_id
        )
        OR (
          e.shared_calendar_id IS NOT NULL
          AND (
            EXISTS (
              SELECT 1
              FROM public.executive_shared_calendars c
              WHERE c.id = e.shared_calendar_id
                AND c.created_by = _user_id
            )
            OR EXISTS (
              SELECT 1
              FROM public.executive_shared_calendar_members m
              WHERE m.calendar_id = e.shared_calendar_id
                AND m.user_id = _user_id
            )
          )
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.exec_can_read_calendar_storage(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_can_read_calendar_storage(text, uuid) TO authenticated;

DROP POLICY IF EXISTS exec_cal_storage_select ON storage.objects;

CREATE POLICY exec_cal_storage_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'executive-calendar-files'
  AND EXISTS (
    SELECT 1
    FROM public.exec_users eu
    WHERE eu.user_id = auth.uid()
  )
  AND public.exec_can_read_calendar_storage(name, auth.uid())
);