-- Executive calendar: default-private events (visible to organizer + invitees only).
-- Optional visibility = 'executives' for org-wide items (all exec_users can see).
-- Existing rows keep legacy behavior (visible to all executives) via backfill.

ALTER TABLE public.executive_calendar_events
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'executives'
  CHECK (visibility IN ('private', 'executives'));

COMMENT ON COLUMN public.executive_calendar_events.visibility IS
  'private: only created_by and invited users; executives: all exec_users (shared org calendar).';

ALTER TABLE public.executive_calendar_events ALTER COLUMN visibility SET DEFAULT 'private';

COMMENT ON TABLE public.executive_calendar_events IS
  'Executive calendar: visibility private (organizer + invitees) or executives (all exec_users).';

-- ---------------------------------------------------------------------------
-- Events: replace wide SELECT with visibility-aware policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "executives_select_calendar" ON public.executive_calendar_events;

CREATE POLICY "executives_select_calendar"
  ON public.executive_calendar_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND (
      created_by = auth.uid()
      OR visibility = 'executives'
      OR EXISTS (
        SELECT 1 FROM public.executive_calendar_event_invites i
        WHERE i.event_id = executive_calendar_events.id
          AND i.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "executives_insert_calendar" ON public.executive_calendar_events;

CREATE POLICY "executives_insert_calendar"
  ON public.executive_calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND visibility IN ('private', 'executives')
  );

DROP POLICY IF EXISTS "executives_update_own_calendar" ON public.executive_calendar_events;

CREATE POLICY "executives_update_own_calendar"
  ON public.executive_calendar_events
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (
    created_by = auth.uid()
    AND visibility IN ('private', 'executives')
  );

-- ---------------------------------------------------------------------------
-- Invites: only executives; see rows if you are that invitee, organizer,
-- org-wide event, or you have any invite on the same event (see guest list)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "exec_cal_invite_select" ON public.executive_calendar_event_invites;

CREATE POLICY "exec_cal_invite_select"
  ON public.executive_calendar_event_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.executive_calendar_events e
        WHERE e.id = executive_calendar_event_invites.event_id
          AND (e.created_by = auth.uid() OR e.visibility = 'executives')
      )
      OR EXISTS (
        SELECT 1 FROM public.executive_calendar_event_invites my
        WHERE my.event_id = executive_calendar_event_invites.event_id
          AND my.user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Attachments: same visibility as parent event
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "exec_cal_att_select" ON public.executive_calendar_event_attachments;

CREATE POLICY "exec_cal_att_select"
  ON public.executive_calendar_event_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.executive_calendar_events e
      WHERE e.id = executive_calendar_event_attachments.event_id
        AND (
          e.created_by = auth.uid()
          OR e.visibility = 'executives'
          OR EXISTS (
            SELECT 1 FROM public.executive_calendar_event_invites i
            WHERE i.event_id = e.id AND i.user_id = auth.uid()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: only files linked to an attachment row event you can access
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "exec_cal_storage_select" ON storage.objects;

CREATE POLICY "exec_cal_storage_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'executive-calendar-files'
    AND EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.executive_calendar_event_attachments att
      JOIN public.executive_calendar_events e ON e.id = att.event_id
      WHERE att.storage_path = name
        AND (
          e.created_by = auth.uid()
          OR e.visibility = 'executives'
          OR EXISTS (
            SELECT 1 FROM public.executive_calendar_event_invites i
            WHERE i.event_id = e.id AND i.user_id = auth.uid()
          )
        )
    )
  );
