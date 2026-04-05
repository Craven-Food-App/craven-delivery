-- CPO pipeline: structured "no / not interested" tracking + history for import/export & re-engagement.

ALTER TABLE public.partnerships
  ADD COLUMN IF NOT EXISTS disposition text,
  ADD COLUMN IF NOT EXISTS disposition_notes text,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS disposition_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS disposition_recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ok_to_reengage boolean NOT NULL DEFAULT true;

ALTER TABLE public.partnerships DROP CONSTRAINT IF EXISTS partnerships_disposition_check;
ALTER TABLE public.partnerships
  ADD CONSTRAINT partnerships_disposition_check
  CHECK (
    disposition IS NULL
    OR disposition IN (
      'not_interested',
      'not_now',
      'competitor',
      'pricing',
      'no_fit',
      'no_response',
      'other'
    )
  );

COMMENT ON COLUMN public.partnerships.disposition IS 'Closed-deal reason (especially when status is lost).';
COMMENT ON COLUMN public.partnerships.disposition_notes IS 'Free-form notes when recording disposition.';
COMMENT ON COLUMN public.partnerships.next_follow_up_at IS 'Optional next touch for nurture / re-engagement campaigns.';
COMMENT ON COLUMN public.partnerships.ok_to_reengage IS 'False = do not contact for outreach; still kept for records.';

CREATE INDEX IF NOT EXISTS idx_partnerships_disposition ON public.partnerships (disposition)
  WHERE disposition IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partnerships_next_follow_up ON public.partnerships (next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.partnership_disposition_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id uuid NOT NULL REFERENCES public.partnerships(id) ON DELETE CASCADE,
  previous_status public.partnership_status,
  new_status public.partnership_status NOT NULL,
  disposition text,
  notes text,
  next_follow_up_at timestamptz,
  ok_to_reengage boolean NOT NULL DEFAULT true,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT partnership_disposition_events_disposition_check CHECK (
    disposition IS NULL
    OR disposition IN (
      'not_interested',
      'not_now',
      'competitor',
      'pricing',
      'no_fit',
      'no_response',
      'other'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_pde_partnership_recorded
  ON public.partnership_disposition_events (partnership_id, recorded_at DESC);

COMMENT ON TABLE public.partnership_disposition_events IS 'Audit trail when a partnership is closed or disposition changes.';

ALTER TABLE public.partnership_disposition_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cpo_portal_access_partnership_disposition_events" ON public.partnership_disposition_events;

CREATE POLICY "cpo_portal_access_partnership_disposition_events"
  ON public.partnership_disposition_events FOR ALL TO authenticated
  USING (public.user_has_cpo_partnership_access())
  WITH CHECK (public.user_has_cpo_partnership_access());

GRANT ALL ON public.partnership_disposition_events TO authenticated;
GRANT ALL ON public.partnership_disposition_events TO service_role;
