-- Named shared calendars with members; events can be placed on a calendar so all members see them.

CREATE TABLE IF NOT EXISTS public.executive_shared_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exec_shared_cal_created_by ON public.executive_shared_calendars (created_by);

COMMENT ON TABLE public.executive_shared_calendars IS
  'Executive shared calendars; creator manages membership; members see all events on the calendar.';

ALTER TABLE public.executive_calendar_events
  ADD COLUMN IF NOT EXISTS shared_calendar_id UUID REFERENCES public.executive_shared_calendars (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_exec_cal_events_shared_cal ON public.executive_calendar_events (shared_calendar_id);

COMMENT ON COLUMN public.executive_calendar_events.shared_calendar_id IS
  'When set, all members of this shared calendar can see the event (in addition to invite/visibility rules).';

-- Members: editor = can add events; viewer = read-only on the calendar feed
CREATE TABLE IF NOT EXISTS public.executive_shared_calendar_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.executive_shared_calendars (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (calendar_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_exec_shared_cal_members_cal ON public.executive_shared_calendar_members (calendar_id);
CREATE INDEX IF NOT EXISTS idx_exec_shared_cal_members_user ON public.executive_shared_calendar_members (user_id);

ALTER TABLE public.executive_shared_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_shared_calendar_members ENABLE ROW LEVEL SECURITY;

-- Calendars: see if you created it or are a member
DROP POLICY IF EXISTS "exec_shared_cal_select" ON public.executive_shared_calendars;
CREATE POLICY "exec_shared_cal_select"
  ON public.executive_shared_calendars FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.executive_shared_calendar_members m
        WHERE m.calendar_id = executive_shared_calendars.id AND m.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "exec_shared_cal_insert" ON public.executive_shared_calendars;
CREATE POLICY "exec_shared_cal_insert"
  ON public.executive_shared_calendars FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "exec_shared_cal_update" ON public.executive_shared_calendars;
CREATE POLICY "exec_shared_cal_update"
  ON public.executive_shared_calendars FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "exec_shared_cal_delete" ON public.executive_shared_calendars;
CREATE POLICY "exec_shared_cal_delete"
  ON public.executive_shared_calendars FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Members
DROP POLICY IF EXISTS "exec_shared_cal_member_select" ON public.executive_shared_calendar_members;
CREATE POLICY "exec_shared_cal_member_select"
  ON public.executive_shared_calendar_members FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.executive_shared_calendars c
        WHERE c.id = executive_shared_calendar_members.calendar_id
          AND c.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.executive_shared_calendar_members m2
        WHERE m2.calendar_id = executive_shared_calendar_members.calendar_id
          AND m2.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "exec_shared_cal_member_insert" ON public.executive_shared_calendar_members;
CREATE POLICY "exec_shared_cal_member_insert"
  ON public.executive_shared_calendar_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.executive_shared_calendars c
      WHERE c.id = calendar_id AND c.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "exec_shared_cal_member_update" ON public.executive_shared_calendar_members;
CREATE POLICY "exec_shared_cal_member_update"
  ON public.executive_shared_calendar_members FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.executive_shared_calendars c
      WHERE c.id = executive_shared_calendar_members.calendar_id AND c.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.executive_shared_calendars c
      WHERE c.id = executive_shared_calendar_members.calendar_id AND c.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "exec_shared_cal_member_delete" ON public.executive_shared_calendar_members;
CREATE POLICY "exec_shared_cal_member_delete"
  ON public.executive_shared_calendar_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.executive_shared_calendars c
      WHERE c.id = executive_shared_calendar_members.calendar_id AND c.created_by = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.set_executive_shared_calendars_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_executive_shared_calendars_updated_at ON public.executive_shared_calendars;
CREATE TRIGGER tr_executive_shared_calendars_updated_at
  BEFORE UPDATE ON public.executive_shared_calendars
  FOR EACH ROW
  EXECUTE FUNCTION public.set_executive_shared_calendars_updated_at();

-- ---------------------------------------------------------------------------
-- executive_calendar_events.visibility (required by policies below)
-- If 20260328210000_executive_calendar_private_visibility.sql was never applied,
-- this column is missing and policy SQL fails with "column visibility does not exist".
-- ---------------------------------------------------------------------------
ALTER TABLE public.executive_calendar_events
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'executives';

DO $vis$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'executive_calendar_events'
      AND c.conname = 'executive_calendar_events_visibility_check'
  ) THEN
    ALTER TABLE public.executive_calendar_events
      ADD CONSTRAINT executive_calendar_events_visibility_check
      CHECK (visibility IN ('private', 'executives'));
  END IF;
END
$vis$;

ALTER TABLE public.executive_calendar_events ALTER COLUMN visibility SET DEFAULT 'private';

COMMENT ON COLUMN public.executive_calendar_events.visibility IS
  'private: organizer + invitees; executives: all exec_users.';

-- ---------------------------------------------------------------------------
-- Events: extend RLS for shared_calendar_id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "executives_select_calendar" ON public.executive_calendar_events;

CREATE POLICY "executives_select_calendar"
  ON public.executive_calendar_events FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND (
      created_by = auth.uid()
      OR visibility = 'executives'
      OR EXISTS (
        SELECT 1 FROM public.executive_calendar_event_invites i
        WHERE i.event_id = executive_calendar_events.id AND i.user_id = auth.uid()
      )
      OR (
        shared_calendar_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.executive_shared_calendar_members m
          WHERE m.calendar_id = executive_calendar_events.shared_calendar_id
            AND m.user_id = auth.uid()
        )
      )
      OR (
        shared_calendar_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.executive_shared_calendars c
          WHERE c.id = executive_calendar_events.shared_calendar_id
            AND c.created_by = auth.uid()
        )
      )
    )
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
      OR EXISTS (
        SELECT 1 FROM public.executive_shared_calendars c
        WHERE c.id = shared_calendar_id
          AND (
            c.created_by = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.executive_shared_calendar_members m
              WHERE m.calendar_id = c.id
                AND m.user_id = auth.uid()
                AND m.role = 'editor'
            )
          )
      )
    )
  );

-- Invites: mirror event visibility (include shared calendar access)
DROP POLICY IF EXISTS "exec_cal_invite_select" ON public.executive_calendar_event_invites;

CREATE POLICY "exec_cal_invite_select"
  ON public.executive_calendar_event_invites FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.executive_calendar_events e
        WHERE e.id = executive_calendar_event_invites.event_id
          AND (
            e.created_by = auth.uid()
            OR e.visibility = 'executives'
            OR (
              e.shared_calendar_id IS NOT NULL
              AND (
                EXISTS (
                  SELECT 1 FROM public.executive_shared_calendar_members m
                  WHERE m.calendar_id = e.shared_calendar_id AND m.user_id = auth.uid()
                )
                OR EXISTS (
                  SELECT 1 FROM public.executive_shared_calendars c
                  WHERE c.id = e.shared_calendar_id AND c.created_by = auth.uid()
                )
              )
            )
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.executive_calendar_event_invites my
        WHERE my.event_id = executive_calendar_event_invites.event_id
          AND my.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "exec_cal_invite_insert" ON public.executive_calendar_event_invites;

CREATE POLICY "exec_cal_invite_insert"
  ON public.executive_calendar_event_invites FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.executive_calendar_events e
      WHERE e.id = event_id
        AND (
          e.created_by = auth.uid()
          OR (
            e.shared_calendar_id IS NOT NULL
            AND (
              EXISTS (
                SELECT 1 FROM public.executive_shared_calendars c
                WHERE c.id = e.shared_calendar_id AND c.created_by = auth.uid()
              )
              OR EXISTS (
                SELECT 1 FROM public.executive_shared_calendar_members m
                WHERE m.calendar_id = e.shared_calendar_id
                  AND m.user_id = auth.uid()
                  AND m.role = 'editor'
              )
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "exec_cal_invite_update" ON public.executive_calendar_event_invites;

CREATE POLICY "exec_cal_invite_update"
  ON public.executive_calendar_event_invites FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.executive_calendar_events e
      WHERE e.id = event_id
        AND (
          e.created_by = auth.uid()
          OR (
            e.shared_calendar_id IS NOT NULL
            AND (
              EXISTS (
                SELECT 1 FROM public.executive_shared_calendars c
                WHERE c.id = e.shared_calendar_id AND c.created_by = auth.uid()
              )
              OR EXISTS (
                SELECT 1 FROM public.executive_shared_calendar_members m
                WHERE m.calendar_id = e.shared_calendar_id
                  AND m.user_id = auth.uid()
                  AND m.role = 'editor'
              )
            )
          )
        )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.executive_calendar_events e
      WHERE e.id = event_id
        AND (
          e.created_by = auth.uid()
          OR (
            e.shared_calendar_id IS NOT NULL
            AND (
              EXISTS (
                SELECT 1 FROM public.executive_shared_calendars c
                WHERE c.id = e.shared_calendar_id AND c.created_by = auth.uid()
              )
              OR EXISTS (
                SELECT 1 FROM public.executive_shared_calendar_members m
                WHERE m.calendar_id = e.shared_calendar_id
                  AND m.user_id = auth.uid()
                  AND m.role = 'editor'
              )
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "exec_cal_invite_delete" ON public.executive_calendar_event_invites;

CREATE POLICY "exec_cal_invite_delete"
  ON public.executive_calendar_event_invites FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.executive_calendar_events e
      WHERE e.id = event_id
        AND (
          e.created_by = auth.uid()
          OR (
            e.shared_calendar_id IS NOT NULL
            AND (
              EXISTS (
                SELECT 1 FROM public.executive_shared_calendars c
                WHERE c.id = e.shared_calendar_id AND c.created_by = auth.uid()
              )
              OR EXISTS (
                SELECT 1 FROM public.executive_shared_calendar_members m
                WHERE m.calendar_id = e.shared_calendar_id
                  AND m.user_id = auth.uid()
                  AND m.role = 'editor'
              )
            )
          )
        )
    )
  );

-- Attachments + storage: event reader paths
DROP POLICY IF EXISTS "exec_cal_att_select" ON public.executive_calendar_event_attachments;

CREATE POLICY "exec_cal_att_select"
  ON public.executive_calendar_event_attachments FOR SELECT TO authenticated
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
          OR (
            e.shared_calendar_id IS NOT NULL
            AND (
              EXISTS (
                SELECT 1 FROM public.executive_shared_calendar_members m
                WHERE m.calendar_id = e.shared_calendar_id AND m.user_id = auth.uid()
              )
              OR EXISTS (
                SELECT 1 FROM public.executive_shared_calendars c
                WHERE c.id = e.shared_calendar_id AND c.created_by = auth.uid()
              )
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "exec_cal_storage_select" ON storage.objects;

CREATE POLICY "exec_cal_storage_select"
  ON storage.objects FOR SELECT TO authenticated
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
          OR (
            e.shared_calendar_id IS NOT NULL
            AND (
              EXISTS (
                SELECT 1 FROM public.executive_shared_calendar_members m
                WHERE m.calendar_id = e.shared_calendar_id AND m.user_id = auth.uid()
              )
              OR EXISTS (
                SELECT 1 FROM public.executive_shared_calendars c
                WHERE c.id = e.shared_calendar_id AND c.created_by = auth.uid()
              )
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "exec_cal_att_insert" ON public.executive_calendar_event_attachments;

CREATE POLICY "exec_cal_att_insert"
  ON public.executive_calendar_event_attachments FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.executive_calendar_events e
      WHERE e.id = event_id
        AND (
          e.created_by = auth.uid()
          OR (
            e.shared_calendar_id IS NOT NULL
            AND (
              EXISTS (
                SELECT 1 FROM public.executive_shared_calendars c
                WHERE c.id = e.shared_calendar_id AND c.created_by = auth.uid()
              )
              OR EXISTS (
                SELECT 1 FROM public.executive_shared_calendar_members m
                WHERE m.calendar_id = e.shared_calendar_id
                  AND m.user_id = auth.uid()
                  AND m.role = 'editor'
              )
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "exec_cal_att_delete" ON public.executive_calendar_event_attachments;

CREATE POLICY "exec_cal_att_delete"
  ON public.executive_calendar_event_attachments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.executive_calendar_events e
      WHERE e.id = event_id
        AND (
          e.created_by = auth.uid()
          OR (
            e.shared_calendar_id IS NOT NULL
            AND (
              EXISTS (
                SELECT 1 FROM public.executive_shared_calendars c
                WHERE c.id = e.shared_calendar_id AND c.created_by = auth.uid()
              )
              OR EXISTS (
                SELECT 1 FROM public.executive_shared_calendar_members m
                WHERE m.calendar_id = e.shared_calendar_id
                  AND m.user_id = auth.uid()
                  AND m.role = 'editor'
              )
            )
          )
        )
    )
  );
