-- One merchant account per user (owner). One unique Merchant ID per account, used for all their stores.
-- Merchants switch between stores/locations in the app; the Merchant ID stays the same.

CREATE TABLE IF NOT EXISTS public.merchant_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_accounts_merchant_id ON public.merchant_accounts(merchant_id);

ALTER TABLE public.merchant_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own merchant account"
  ON public.merchant_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.generate_merchant_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'CRV-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
$$;

CREATE OR REPLACE FUNCTION public.ensure_merchant_account(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_merchant_id text;
BEGIN
  SELECT merchant_id INTO v_merchant_id FROM public.merchant_accounts WHERE user_id = p_user_id LIMIT 1;
  IF v_merchant_id IS NOT NULL THEN
    RETURN v_merchant_id;
  END IF;
  v_merchant_id := public.generate_merchant_id();
  INSERT INTO public.merchant_accounts (user_id, merchant_id)
  VALUES (p_user_id, v_merchant_id)
  ON CONFLICT (user_id) DO UPDATE SET merchant_id = public.merchant_accounts.merchant_id
  RETURNING merchant_id INTO v_merchant_id;
  RETURN v_merchant_id;
END;
$$;

INSERT INTO public.merchant_accounts (user_id, merchant_id)
SELECT o.owner_id, 'CRV-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8))
FROM (SELECT DISTINCT owner_id FROM public.restaurants WHERE owner_id IS NOT NULL) o
ON CONFLICT (user_id) DO NOTHING;

GRANT SELECT ON public.merchant_accounts TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_merchant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_merchant_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_merchant_account(uuid) TO service_role;

-- Ensure new merchants get a row when they create their first restaurant
CREATE OR REPLACE FUNCTION public.ensure_merchant_account_on_restaurant_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    PERFORM public.ensure_merchant_account(NEW.owner_id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_ensure_merchant_account_on_restaurant_insert ON public.restaurants;
CREATE TRIGGER trg_ensure_merchant_account_on_restaurant_insert
  AFTER INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_merchant_account_on_restaurant_insert();

COMMENT ON TABLE public.merchant_accounts IS 'One row per merchant (user). merchant_id is the unique ID shown in app and used for tablet login (last 4 verification).';
COMMENT ON COLUMN public.merchant_accounts.merchant_id IS 'Unique ID for this merchant account (e.g. CRV-XXXXXXXX). Same for all stores they own.';
