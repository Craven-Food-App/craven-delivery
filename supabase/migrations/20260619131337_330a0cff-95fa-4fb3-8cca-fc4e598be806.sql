ALTER TABLE public.cx_jobs
  ADD COLUMN IF NOT EXISTS dispatch_round integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tier_open boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_broadcast_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_cx_jobs_next_broadcast
  ON public.cx_jobs (next_broadcast_at)
  WHERE assigned_driver_id IS NULL AND status IN ('posted', 'offered');

ALTER TABLE public.cx_pricing_config
  ADD COLUMN IF NOT EXISTS fallback_seconds integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS max_rounds integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS expire_seconds integer NOT NULL DEFAULT 900;