-- Fix infinite recursion on executive_shared_calendar_members RLS (42P17)

CREATE OR REPLACE FUNCTION public.exec_shared_calendar_is_member(_calendar_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.executive_shared_calendar_members m
    WHERE m.calendar_id = _calendar_id
      AND m.user_id = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.exec_shared_calendar_is_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_shared_calendar_is_member(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS exec_shared_cal_member_select ON public.executive_shared_calendar_members;

CREATE POLICY exec_shared_cal_member_select
ON public.executive_shared_calendar_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.exec_users eu
    WHERE eu.user_id = auth.uid()
  )
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.executive_shared_calendars c
      WHERE c.id = executive_shared_calendar_members.calendar_id
        AND c.created_by = auth.uid()
    )
    OR public.exec_shared_calendar_is_member(executive_shared_calendar_members.calendar_id, auth.uid())
  )
);