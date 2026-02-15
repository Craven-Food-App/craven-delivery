
-- First, ensure feeder_wallets exist for all drivers with earnings
INSERT INTO feeder_wallets (feeder_id, currency)
SELECT DISTINCT de.driver_id, 'USD'
FROM driver_earnings de
WHERE de.driver_id IS NOT NULL
ON CONFLICT (feeder_id) DO NOTHING;

-- Backfill base pay entries from driver_earnings
INSERT INTO feeder_wallet_ledger_entries (
  wallet_id, feeder_id, occurred_at, type, direction, 
  amount_cents, status, source_type, source_id, idempotency_key
)
SELECT 
  fw.id, de.driver_id, de.earned_at, 'earnings_base_pay', 'credit',
  de.amount_cents, 'available', 'order', de.order_id::text,
  'order_' || de.order_id || '_base_pay'
FROM driver_earnings de
JOIN feeder_wallets fw ON fw.feeder_id = de.driver_id
WHERE de.amount_cents > 0
ON CONFLICT (idempotency_key) DO NOTHING;

-- Backfill tip entries from driver_earnings
INSERT INTO feeder_wallet_ledger_entries (
  wallet_id, feeder_id, occurred_at, type, direction, 
  amount_cents, status, source_type, source_id, idempotency_key
)
SELECT 
  fw.id, de.driver_id, de.earned_at, 'earnings_tip', 'credit',
  de.tip_cents, 'available', 'order', de.order_id::text,
  'order_' || de.order_id || '_tip'
FROM driver_earnings de
JOIN feeder_wallets fw ON fw.feeder_id = de.driver_id
WHERE de.tip_cents > 0
ON CONFLICT (idempotency_key) DO NOTHING;

-- Backfill payout_debit entries from driver_payouts (use created_at since paid_at doesn't exist)
INSERT INTO feeder_wallet_ledger_entries (
  wallet_id, feeder_id, occurred_at, type, direction, 
  amount_cents, status, source_type, source_id, idempotency_key
)
SELECT 
  fw.id, dp.driver_id, dp.created_at, 'payout_debit', 'debit',
  dp.amount_cents, 'paid', 'payout', dp.id::text,
  'payout_' || dp.id
FROM driver_payouts dp
JOIN feeder_wallets fw ON fw.feeder_id = dp.driver_id
WHERE dp.status IN ('paid', 'completed', 'sent')
  AND dp.amount_cents > 0
ON CONFLICT (idempotency_key) DO NOTHING;
