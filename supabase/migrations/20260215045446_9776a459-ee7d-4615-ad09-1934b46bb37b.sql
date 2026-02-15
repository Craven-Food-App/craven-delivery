
-- Phase 1: Ledger-based wallet system

CREATE TABLE public.feeder_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feeder_id uuid NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feeder_wallets_feeder_id_unique UNIQUE (feeder_id)
);

ALTER TABLE public.feeder_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feeders can view own wallet"
  ON public.feeder_wallets FOR SELECT
  USING (auth.uid() = feeder_id);

CREATE TABLE public.feeder_wallet_ledger_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id uuid NOT NULL REFERENCES public.feeder_wallets(id),
  feeder_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  type text NOT NULL CHECK (type IN (
    'earnings_base_pay',
    'earnings_distance_pay',
    'earnings_tip',
    'earnings_bonus',
    'earnings_adjustment_credit',
    'earnings_adjustment_debit',
    'payout_debit',
    'payout_fee_debit',
    'gas_credit',
    'gas_transfer_debit'
  )),
  direction text NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'available', 'processing', 'paid', 'failed', 'reversed'
  )),
  source_type text NOT NULL CHECK (source_type IN ('order', 'payout', 'admin', 'system')),
  source_id text,
  memo text,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feeder_wallet_ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feeders can view own ledger entries"
  ON public.feeder_wallet_ledger_entries FOR SELECT
  USING (auth.uid() = feeder_id);

CREATE INDEX idx_ledger_feeder_occurred ON public.feeder_wallet_ledger_entries (feeder_id, occurred_at);
CREATE INDEX idx_ledger_feeder_type_status ON public.feeder_wallet_ledger_entries (feeder_id, type, status);
CREATE INDEX idx_ledger_wallet_id ON public.feeder_wallet_ledger_entries (wallet_id);
CREATE INDEX idx_ledger_source ON public.feeder_wallet_ledger_entries (source_type, source_id);

-- Migrate existing data: create wallets
INSERT INTO public.feeder_wallets (feeder_id, currency, created_at)
SELECT DISTINCT driver_id, 'USD', now()
FROM public.driver_earnings
ON CONFLICT (feeder_id) DO NOTHING;

-- Migrate base_pay (amount_cents minus tip_cents = base pay)
INSERT INTO public.feeder_wallet_ledger_entries (
  wallet_id, feeder_id, occurred_at, type, direction, amount_cents, status, source_type, source_id, idempotency_key
)
SELECT
  fw.id, de.driver_id, de.earned_at, 'earnings_base_pay', 'credit',
  de.amount_cents, 'available', 'order', de.order_id::text,
  'migrate_base_' || de.id::text
FROM public.driver_earnings de
JOIN public.feeder_wallets fw ON fw.feeder_id = de.driver_id
WHERE de.amount_cents > 0
ON CONFLICT (idempotency_key) DO NOTHING;

-- Migrate tips
INSERT INTO public.feeder_wallet_ledger_entries (
  wallet_id, feeder_id, occurred_at, type, direction, amount_cents, status, source_type, source_id, idempotency_key
)
SELECT
  fw.id, de.driver_id, de.earned_at, 'earnings_tip', 'credit',
  de.tip_cents, 'available', 'order', de.order_id::text,
  'migrate_tip_' || de.id::text
FROM public.driver_earnings de
JOIN public.feeder_wallets fw ON fw.feeder_id = de.driver_id
WHERE de.tip_cents > 0
ON CONFLICT (idempotency_key) DO NOTHING;

-- Migrate paid payouts
INSERT INTO public.feeder_wallet_ledger_entries (
  wallet_id, feeder_id, occurred_at, type, direction, amount_cents, status, source_type, source_id, idempotency_key
)
SELECT
  fw.id, dp.driver_id, COALESCE(dp.arrival_date, dp.created_at), 'payout_debit', 'debit',
  dp.amount_cents, 'paid', 'payout', dp.stripe_payout_id,
  'migrate_payout_' || dp.id::text
FROM public.driver_payouts dp
JOIN public.feeder_wallets fw ON fw.feeder_id = dp.driver_id
WHERE dp.status IN ('paid', 'completed', 'sent') AND dp.amount_cents > 0
ON CONFLICT (idempotency_key) DO NOTHING;
