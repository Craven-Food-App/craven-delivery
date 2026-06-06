
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS merchant_adjust_authorized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS merchant_adjust_authorized_at timestamptz,
  ADD COLUMN IF NOT EXISTS merchant_adjust_authorized_by uuid,
  ADD COLUMN IF NOT EXISTS cs_incentive_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cs_bonus_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cs_notes text;

CREATE TABLE IF NOT EXISTS public.support_order_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  thread_id uuid,
  action_type text NOT NULL,
  amount_cents integer,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  performed_by uuid,
  performed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_order_actions_order_idx ON public.support_order_actions(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_order_actions_thread_idx ON public.support_order_actions(thread_id, created_at DESC);

GRANT SELECT, INSERT ON public.support_order_actions TO authenticated;
GRANT ALL ON public.support_order_actions TO service_role;

ALTER TABLE public.support_order_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support agents read all action logs" ON public.support_order_actions;
CREATE POLICY "Support agents read all action logs"
  ON public.support_order_actions FOR SELECT
  TO authenticated
  USING (public.is_support_agent(auth.uid()));

DROP POLICY IF EXISTS "Support agents insert action logs" ON public.support_order_actions;
CREATE POLICY "Support agents insert action logs"
  ON public.support_order_actions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_support_agent(auth.uid()));
