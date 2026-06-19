-- CX Subscription plans
CREATE TABLE IF NOT EXISTS public.cx_subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  monthly_price_cents integer NOT NULL DEFAULT 0,
  included_jobs integer NOT NULL DEFAULT 0,
  overage_cents integer NOT NULL DEFAULT 0,
  stripe_price_id text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cx_subscription_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cx_subscription_plans TO authenticated;
GRANT ALL ON public.cx_subscription_plans TO service_role;

ALTER TABLE public.cx_subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cx_plans_public_read"
  ON public.cx_subscription_plans FOR SELECT
  USING (active = true);

CREATE POLICY "cx_plans_admin_manage"
  ON public.cx_subscription_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Billing fields on restaurants (used only by courier merchants)
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS cx_stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS cx_stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS cx_subscription_status text,
  ADD COLUMN IF NOT EXISTS cx_plan_id uuid REFERENCES public.cx_subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cx_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cx_insurance_approved boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_restaurants_cx_subscription
  ON public.restaurants(cx_stripe_subscription_id)
  WHERE cx_stripe_subscription_id IS NOT NULL;

-- updated_at trigger
CREATE TRIGGER trg_cx_subscription_plans_updated_at
  BEFORE UPDATE ON public.cx_subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed starter plans (stripe_price_id filled in later by admin)
INSERT INTO public.cx_subscription_plans (slug, name, description, monthly_price_cents, included_jobs, overage_cents, sort_order)
VALUES
  ('cx_starter', 'CX Starter', 'For small courier ops. Up to 100 dispatches / month.', 4900, 100, 75, 1),
  ('cx_growth',  'CX Growth',  'For growing fleets. Up to 500 dispatches / month.', 14900, 500, 50, 2),
  ('cx_fleet',   'CX Fleet',   'For high-volume couriers. Up to 2,000 dispatches / month.', 39900, 2000, 35, 3)
ON CONFLICT (slug) DO NOTHING;