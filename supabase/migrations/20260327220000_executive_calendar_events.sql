-- Shared executive calendar: meetings, events, focus blocks, reminders.
-- All rows visible to users with an exec_users record; only creator can mutate own rows.

CREATE TABLE IF NOT EXISTS public.executive_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  event_type TEXT NOT NULL DEFAULT 'meeting'
    CHECK (event_type IN ('meeting', 'event', 'focus', 'reminder')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_executive_calendar_events_range
  ON public.executive_calendar_events USING btree (starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_executive_calendar_events_created_by
  ON public.executive_calendar_events (created_by);

COMMENT ON TABLE public.executive_calendar_events IS 'Shared schedule visible to all executives (exec_users).';

ALTER TABLE public.executive_calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "executives_select_calendar" ON public.executive_calendar_events;
DROP POLICY IF EXISTS "executives_insert_calendar" ON public.executive_calendar_events;
DROP POLICY IF EXISTS "executives_update_own_calendar" ON public.executive_calendar_events;
DROP POLICY IF EXISTS "executives_delete_own_calendar" ON public.executive_calendar_events;

CREATE POLICY "executives_select_calendar"
  ON public.executive_calendar_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
  );

CREATE POLICY "executives_insert_calendar"
  ON public.executive_calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.exec_users eu WHERE eu.user_id = auth.uid())
  );

CREATE POLICY "executives_update_own_calendar"
  ON public.executive_calendar_events
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "executives_delete_own_calendar"
  ON public.executive_calendar_events
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.set_executive_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_executive_calendar_events_updated_at ON public.executive_calendar_events;
CREATE TRIGGER tr_executive_calendar_events_updated_at
  BEFORE UPDATE ON public.executive_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_executive_calendar_events_updated_at();
