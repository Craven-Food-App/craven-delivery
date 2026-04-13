-- Break infinite recursion between executive_calendar_events and executive_calendar_event_invites RLS:
-- events SELECT referenced invites; invites SELECT referenced events → loop.
-- Shared-calendar EXISTS subqueries on events also re-triggered member/calendar RLS.
-- Helpers use SECURITY DEFINER so checks do not re-enter row policies on those tables.

CREATE OR REPLACE FUNCTION public.exec_user_invited_to_event(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.executive_calendar_event_invites i
    WHERE i.event_id = p_event_id AND i.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.exec_event_visible_to_user(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT
        e.created_by = p_user_id
        OR e.visibility = 'executives'
        OR public.exec_user_invited_to_event(p_event_id, p_user_id)
        OR (
          e.shared_calendar_id IS NOT NULL
          AND (
            public.exec_user_owns_shared_calendar(e.shared_calendar_id, p_user_id)
            OR public.exec_user_is_shared_calendar_member(e.shared_calendar_id, p_user_id)
          )
        )
      FROM public.executive_calendar_events e
      WHERE e.id = p_event_id
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.exec_user_can_insert_event_on_shared_calendar(p_calendar_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.exec_user_owns_shared_calendar(p_calendar_id, p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.executive_shared_calendar_members m
      WHERE m.calendar_id = p_calendar_id
        AND m.user_id = p_user_id
        AND m.role = 'editor'
    );
$$;

CREATE OR REPLACE FUNCTION public.exec_user_can_manage_calendar_event(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT
        e.created_by = p_user_id
        OR (
          e.shared_calendar_id IS NOT NULL
          AND (
            public.exec_user_owns_shared_calendar(e.shared_calendar_id, p_user_id)
            OR EXISTS (
              SELECT 1
              FROM public.executive_shared_calendar_members m
              WHERE m.calendar_id = e.shared_calendar_id
                AND m.user_id = p_user_id
                AND m.role = 'editor'
            )
          )
        )
      FROM public.executive_calendar_events e
      WHERE e.id = p_event_id
    ),
    false
  );
$$;

COMMENT ON FUNCTION public.exec_user_invited_to_event(uuid, uuid) IS
  'RLS helper: invite lookup without re-entering executive_calendar_events policies.';
COMMENT ON FUNCTION public.exec_event_visible_to_user(uuid, uuid) IS
  'RLS helper: event visibility (organizer, org-wide, invitee, shared calendar) without policy recursion.';
COMMENT ON FUNCTION public.exec_user_can_insert_event_on_shared_calendar(uuid, uuid) IS
  'RLS helper: shared calendar owner or editor may create events on that calendar.';
COMMENT ON FUNCTION public.exec_user_can_manage_calendar_event(uuid, uuid) IS
  'RLS helper: organizer or shared-calendar editor/owner may manage invites/attachments.';

-- Events
DROP POLICY IF EXISTS "executives_select_calendar" ON public.executive_calendar_events;
CREATE POLICY "executives_select_calendar"
  ON public.executive_calendar_events FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND public.exec_event_visible_to_user(id, auth.uid())
  );

DROP POLICY IF EXISTS "executives_insert_calendar" ON public.executive_calendar_events;
CREATE POLICY "executives_insert_calendar"
  ON public.executive_calendar_events FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND visibility IN ('private', 'executives')
    AND (
      shared_calendar_id IS NULL
      OR public.exec_user_can_insert_event_on_shared_calendar(shared_calendar_id, auth.uid())
    )
  );

-- Invites
DROP POLICY IF EXISTS "exec_cal_invite_select" ON public.executive_calendar_event_invites;
CREATE POLICY "exec_cal_invite_select"
  ON public.executive_calendar_event_invites FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND (
      user_id = auth.uid()
      OR public.exec_event_visible_to_user(event_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "exec_cal_invite_insert" ON public.executive_calendar_event_invites;
CREATE POLICY "exec_cal_invite_insert"
  ON public.executive_calendar_event_invites FOR INSERT TO authenticated
  WITH CHECK (public.exec_user_can_manage_calendar_event(event_id, auth.uid()));

DROP POLICY IF EXISTS "exec_cal_invite_update" ON public.executive_calendar_event_invites;
CREATE POLICY "exec_cal_invite_update"
  ON public.executive_calendar_event_invites FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.exec_user_can_manage_calendar_event(event_id, auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.exec_user_can_manage_calendar_event(event_id, auth.uid())
  );

DROP POLICY IF EXISTS "exec_cal_invite_delete" ON public.executive_calendar_event_invites;
CREATE POLICY "exec_cal_invite_delete"
  ON public.executive_calendar_event_invites FOR DELETE TO authenticated
  USING (public.exec_user_can_manage_calendar_event(event_id, auth.uid()));

-- Attachments
DROP POLICY IF EXISTS "exec_cal_att_select" ON public.executive_calendar_event_attachments;
CREATE POLICY "exec_cal_att_select"
  ON public.executive_calendar_event_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND public.exec_event_visible_to_user(event_id, auth.uid())
  );

DROP POLICY IF EXISTS "exec_cal_att_insert" ON public.executive_calendar_event_attachments;
CREATE POLICY "exec_cal_att_insert"
  ON public.executive_calendar_event_attachments FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND public.exec_user_can_manage_calendar_event(event_id, auth.uid())
  );

DROP POLICY IF EXISTS "exec_cal_att_delete" ON public.executive_calendar_event_attachments;
CREATE POLICY "exec_cal_att_delete"
  ON public.executive_calendar_event_attachments FOR DELETE TO authenticated
  USING (public.exec_user_can_manage_calendar_event(event_id, auth.uid()));

-- Storage: resolve event access via helper (no direct join through event RLS)
DROP POLICY IF EXISTS "exec_cal_storage_select" ON storage.objects;
CREATE POLICY "exec_cal_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'executive-calendar-files'
    AND EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.executive_calendar_event_attachments att
      WHERE att.storage_path = name
        AND public.exec_event_visible_to_user(att.event_id, auth.uid())
    )
  );

GRANT EXECUTE ON FUNCTION public.exec_user_invited_to_event(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_event_visible_to_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_user_can_insert_event_on_shared_calendar(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_user_can_manage_calendar_event(uuid, uuid) TO authenticated;
