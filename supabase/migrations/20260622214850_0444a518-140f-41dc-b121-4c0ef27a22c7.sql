
ALTER TABLE public.cx_jobs
  ADD COLUMN IF NOT EXISTS requester_type text NOT NULL DEFAULT 'customer'
    CHECK (requester_type IN ('customer','merchant','company')),
  ADD COLUMN IF NOT EXISTS dispatch_mode text NOT NULL DEFAULT 'dual'
    CHECK (dispatch_mode IN ('dual','cx_priority')),
  ADD COLUMN IF NOT EXISTS dispatch_radius_miles numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS cx_exclusive_until timestamptz,
  ADD COLUMN IF NOT EXISTS eligible_feeder_tiers text[] NOT NULL DEFAULT ARRAY['elite','ultimate']::text[],
  ADD COLUMN IF NOT EXISTS broadcast_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS claimed_by_pool text CHECK (claimed_by_pool IN ('cx','feeder')),
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_status text NOT NULL DEFAULT 'pending'
    CHECK (dispatch_status IN ('pending','broadcasting','claimed','expired','cancelled'));

CREATE INDEX IF NOT EXISTS idx_cx_jobs_dispatch_status ON public.cx_jobs(dispatch_status);
CREATE INDEX IF NOT EXISTS idx_cx_jobs_cx_exclusive_until ON public.cx_jobs(cx_exclusive_until);

CREATE TABLE IF NOT EXISTS public.cx_dispatch_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  default_radius_miles numeric NOT NULL DEFAULT 15,
  cx_exclusive_seconds integer NOT NULL DEFAULT 30,
  eligible_feeder_tiers text[] NOT NULL DEFAULT ARRAY['elite','ultimate']::text[],
  customer_dispatch_mode text NOT NULL DEFAULT 'dual'
    CHECK (customer_dispatch_mode IN ('dual','cx_priority')),
  company_dispatch_mode text NOT NULL DEFAULT 'cx_priority'
    CHECK (company_dispatch_mode IN ('dual','cx_priority')),
  merchant_dispatch_mode text NOT NULL DEFAULT 'cx_priority'
    CHECK (merchant_dispatch_mode IN ('dual','cx_priority')),
  auto_dispatch_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cx_dispatch_settings TO authenticated;
GRANT ALL ON public.cx_dispatch_settings TO service_role;

ALTER TABLE public.cx_dispatch_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cx_dispatch_settings_read_auth" ON public.cx_dispatch_settings;
CREATE POLICY "cx_dispatch_settings_read_auth"
  ON public.cx_dispatch_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "cx_dispatch_settings_admin_write" ON public.cx_dispatch_settings;
CREATE POLICY "cx_dispatch_settings_admin_write"
  ON public.cx_dispatch_settings FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'cpo')
    OR public.has_role(auth.uid(),'ceo')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'cpo')
    OR public.has_role(auth.uid(),'ceo')
  );

INSERT INTO public.cx_dispatch_settings (singleton) VALUES (true)
  ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.cx_dispatch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.cx_jobs(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  pool text,
  actor_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cx_dispatch_events_job ON public.cx_dispatch_events(job_id, created_at DESC);

GRANT SELECT, INSERT ON public.cx_dispatch_events TO authenticated;
GRANT ALL ON public.cx_dispatch_events TO service_role;

ALTER TABLE public.cx_dispatch_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cx_dispatch_events_admin_read" ON public.cx_dispatch_events;
CREATE POLICY "cx_dispatch_events_admin_read"
  ON public.cx_dispatch_events FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'cpo')
    OR public.has_role(auth.uid(),'ceo')
  );

DROP POLICY IF EXISTS "cx_dispatch_events_service_insert" ON public.cx_dispatch_events;
CREATE POLICY "cx_dispatch_events_service_insert"
  ON public.cx_dispatch_events FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.claim_cx_job(p_job_id uuid, p_pool text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.cx_jobs%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_pool NOT IN ('cx','feeder') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_pool');
  END IF;

  SELECT * INTO v_job FROM public.cx_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_job.dispatch_status = 'claimed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  IF v_job.dispatch_status NOT IN ('pending','broadcasting') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  IF p_pool = 'feeder'
     AND v_job.cx_exclusive_until IS NOT NULL
     AND v_job.cx_exclusive_until > now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cx_exclusive_window');
  END IF;

  UPDATE public.cx_jobs
     SET dispatch_status = 'claimed',
         claimed_by_user_id = v_uid,
         claimed_by_pool = p_pool,
         claimed_at = now()
   WHERE id = p_job_id;

  INSERT INTO public.cx_dispatch_events (job_id, event_type, pool, actor_user_id)
  VALUES (p_job_id, 'claimed', p_pool, v_uid);

  RETURN jsonb_build_object('ok', true, 'job_id', p_job_id, 'pool', p_pool);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_cx_job(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cx_dispatch_settings_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_cx_dispatch_settings_touch ON public.cx_dispatch_settings;
CREATE TRIGGER trg_cx_dispatch_settings_touch
  BEFORE UPDATE ON public.cx_dispatch_settings
  FOR EACH ROW EXECUTE FUNCTION public.cx_dispatch_settings_touch();

ALTER PUBLICATION supabase_realtime ADD TABLE public.cx_dispatch_events;
