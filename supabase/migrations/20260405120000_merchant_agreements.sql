-- Merchant Terms of Service acceptance audit trail (per merchant account / owner).
-- merchant_id matches public.merchant_accounts.merchant_id (text, e.g. CRV-XXXXXXXX).

CREATE TABLE IF NOT EXISTS public.merchant_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id text NOT NULL REFERENCES public.merchant_accounts (merchant_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  terms_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_agreements_merchant_id ON public.merchant_agreements (merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_agreements_terms_version ON public.merchant_agreements (terms_version);
CREATE INDEX IF NOT EXISTS idx_merchant_agreements_accepted_at ON public.merchant_agreements (accepted_at DESC);

COMMENT ON TABLE public.merchant_agreements IS 'Records click-wrap acceptance of Merchant Terms; terms_version must match app constant when enforcing.';
COMMENT ON COLUMN public.merchant_agreements.ip_address IS 'Client-reported IP at acceptance (best-effort; may be null).';

ALTER TABLE public.merchant_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can read own merchant_agreements"
  ON public.merchant_agreements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.merchant_accounts ma
      WHERE ma.merchant_id = merchant_agreements.merchant_id
        AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can insert own merchant_agreements"
  ON public.merchant_agreements FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.merchant_accounts ma
      WHERE ma.merchant_id = merchant_agreements.merchant_id
        AND ma.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON public.merchant_agreements TO authenticated;
