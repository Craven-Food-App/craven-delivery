-- Break infinite recursion between executive_shared_calendars and executive_shared_calendar_members RLS:
-- calendar SELECT referenced members; members SELECT referenced calendars → loop.
-- Helpers use SECURITY DEFINER to read underlying rows without re-entering RLS.

CREATE OR REPLACE FUNCTION public.exec_user_owns_shared_calendar(p_calendar_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.executive_shared_calendars c
    WHERE c.id = p_calendar_id AND c.created_by = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.exec_user_is_shared_calendar_member(p_calendar_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.executive_shared_calendar_members m
    WHERE m.calendar_id = p_calendar_id AND m.user_id = p_user_id
  );
$$;

COMMENT ON FUNCTION public.exec_user_owns_shared_calendar(uuid, uuid) IS
  'RLS helper: avoids recursion when policies on calendars/members reference each other.';
COMMENT ON FUNCTION public.exec_user_is_shared_calendar_member(uuid, uuid) IS
  'RLS helper: membership check without re-entering calendar RLS.';

-- Calendars: see if you created it or are a member (no raw EXISTS into members table)
DROP POLICY IF EXISTS "exec_shared_cal_select" ON public.executive_shared_calendars;
CREATE POLICY "exec_shared_cal_select"
  ON public.executive_shared_calendars FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND (
      created_by = auth.uid()
      OR public.exec_user_is_shared_calendar_member(id, auth.uid())
    )
  );

-- Members: self-row, creator (via helper), or co-member (via helper)
DROP POLICY IF EXISTS "exec_shared_cal_member_select" ON public.executive_shared_calendar_members;
CREATE POLICY "exec_shared_cal_member_select"
  ON public.executive_shared_calendar_members FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND (
      user_id = auth.uid()
      OR public.exec_user_owns_shared_calendar(calendar_id, auth.uid())
      OR public.exec_user_is_shared_calendar_member(calendar_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "exec_shared_cal_member_insert" ON public.executive_shared_calendar_members;
CREATE POLICY "exec_shared_cal_member_insert"
  ON public.executive_shared_calendar_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND public.exec_user_owns_shared_calendar(calendar_id, auth.uid())
  );

DROP POLICY IF EXISTS "exec_shared_cal_member_update" ON public.executive_shared_calendar_members;
CREATE POLICY "exec_shared_cal_member_update"
  ON public.executive_shared_calendar_members FOR UPDATE TO authenticated
  USING (public.exec_user_owns_shared_calendar(calendar_id, auth.uid()))
  WITH CHECK (public.exec_user_owns_shared_calendar(calendar_id, auth.uid()));

DROP POLICY IF EXISTS "exec_shared_cal_member_delete" ON public.executive_shared_calendar_members;
CREATE POLICY "exec_shared_cal_member_delete"
  ON public.executive_shared_calendar_members FOR DELETE TO authenticated
  USING (public.exec_user_owns_shared_calendar(calendar_id, auth.uid()));

GRANT EXECUTE ON FUNCTION public.exec_user_owns_shared_calendar(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_user_is_shared_calendar_member(uuid, uuid) TO authenticated;
