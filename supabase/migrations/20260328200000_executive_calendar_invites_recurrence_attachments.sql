-- Invitations, recurrence, and attachments for executive_calendar_events

ALTER TABLE public.executive_calendar_events
  ADD COLUMN IF NOT EXISTS recurrence jsonb;

COMMENT ON COLUMN public.executive_calendar_events.recurrence IS
  'Optional recurrence: { "frequency": "daily"|"weekly"|"monthly", "interval": number, "until": "YYYY-MM-DD", "weekdays": [0-6] }';

-- ---------------------------------------------------------------------------
-- Invites (RSVP)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.executive_calendar_event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.executive_calendar_events (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  response TEXT NOT NULL DEFAULT 'pending'
    CHECK (response IN ('pending', 'accepted', 'declined', 'tentative')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_exec_cal_invites_event ON public.executive_calendar_event_invites (event_id);
CREATE INDEX IF NOT EXISTS idx_exec_cal_invites_user ON public.executive_calendar_event_invites (user_id);

ALTER TABLE public.executive_calendar_event_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exec_cal_invite_select" ON public.executive_calendar_event_invites;
DROP POLICY IF EXISTS "exec_cal_invite_insert" ON public.executive_calendar_event_invites;
DROP POLICY IF EXISTS "exec_cal_invite_update" ON public.executive_calendar_event_invites;
DROP POLICY IF EXISTS "exec_cal_invite_delete" ON public.executive_calendar_event_invites;

CREATE POLICY "exec_cal_invite_select"
  ON public.executive_calendar_event_invites FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
  );

CREATE POLICY "exec_cal_invite_insert"
  ON public.executive_calendar_event_invites FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.executive_calendar_events e
      WHERE e.id = event_id AND e.created_by = auth.uid()
    )
  );

CREATE POLICY "exec_cal_invite_update"
  ON public.executive_calendar_event_invites FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.executive_calendar_events e
      WHERE e.id = event_id AND e.created_by = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.executive_calendar_events e
      WHERE e.id = event_id AND e.created_by = auth.uid()
    )
  );

CREATE POLICY "exec_cal_invite_delete"
  ON public.executive_calendar_event_invites FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.executive_calendar_events e
      WHERE e.id = event_id AND e.created_by = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- File attachments (paths into storage bucket executive-calendar-files)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.executive_calendar_event_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.executive_calendar_events (id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exec_cal_att_event ON public.executive_calendar_event_attachments (event_id);

ALTER TABLE public.executive_calendar_event_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exec_cal_att_select" ON public.executive_calendar_event_attachments;
DROP POLICY IF EXISTS "exec_cal_att_insert" ON public.executive_calendar_event_attachments;
DROP POLICY IF EXISTS "exec_cal_att_delete" ON public.executive_calendar_event_attachments;

CREATE POLICY "exec_cal_att_select"
  ON public.executive_calendar_event_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
  );

CREATE POLICY "exec_cal_att_insert"
  ON public.executive_calendar_event_attachments FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.executive_calendar_events e
      WHERE e.id = event_id AND e.created_by = auth.uid()
    )
  );

CREATE POLICY "exec_cal_att_delete"
  ON public.executive_calendar_event_attachments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.executive_calendar_events e
      WHERE e.id = event_id AND e.created_by = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket (private; executives only)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('executive-calendar-files', 'executive-calendar-files', false, 52428800)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "exec_cal_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "exec_cal_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "exec_cal_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "exec_cal_storage_delete" ON storage.objects;

CREATE POLICY "exec_cal_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'executive-calendar-files'
    AND EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
  );

CREATE POLICY "exec_cal_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'executive-calendar-files'
    AND EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
  );

CREATE POLICY "exec_cal_storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'executive-calendar-files'
    AND EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
  );

CREATE POLICY "exec_cal_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'executive-calendar-files'
    AND EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
  );
