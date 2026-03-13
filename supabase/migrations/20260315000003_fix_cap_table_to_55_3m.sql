-- Align cap table with target 70M / 55.3M / 14.7M structure
-- - Total authorized: 70,000,000
-- - Issued:
--     * Invero, Inc. (Holding Company): 40,600,000
--     * Torrance Stroman (Founder):     10,500,000
--     * Executives via grants:           4,200,000  (from equity_ledger)
--   => Total issued:                    55,300,000
-- - Unissued / Equity Pool:
--     * Equity Pool (Reserved):         13,300,000
--     * Micro-Equity Pool:              1,400,000
--   => Total unissued:                  14,700,000

UPDATE public.cap_tables
SET
  total_authorized   = 70000000,
  holding_company_shares       = 40600000,   -- Invero, Inc. (Holding Company)
  holding_company_percentage   = 58.00,
  founder_shares     = 10500000,   -- Torrance Stroman
  founder_percentage = 15.00,
  equity_pool        = 13300000,   -- Reserved equity pool (non-micro)
  pool_percentage    = 21.00,
  micro_equity_pool  = 1400000,    -- Dedicated micro-equity pool
  total_issued       = 55300000,   -- 40.6M + 10.5M + 4.2M (from grants)
  total_unissued     = 14700000,   -- 70M - 55.3M
  updated_at         = NOW()
WHERE id = (SELECT id FROM public.cap_tables LIMIT 1);

-- Sanity check: ensure invariants hold
DO $$
DECLARE
  rec RECORD;
BEGIN
  SELECT * INTO rec FROM public.cap_tables LIMIT 1;

  IF rec.total_authorized != 70000000 THEN
    RAISE EXCEPTION 'Cap table total_authorized should be 70,000,000, got %', rec.total_authorized;
  END IF;

  IF rec.total_issued > rec.total_authorized THEN
    RAISE EXCEPTION 'Cap table total_issued (%) cannot exceed total_authorized (%)', rec.total_issued, rec.total_authorized;
  END IF;

  IF rec.total_unissued < 0 THEN
    RAISE EXCEPTION 'Cap table total_unissued (%) cannot be negative', rec.total_unissued;
  END IF;
END $$;

