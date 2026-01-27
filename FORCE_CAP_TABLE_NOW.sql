-- ==============================================================================
-- FORCE CAP TABLE TO EXACT VALUES - NO ERRORS, NO EXCUSES
-- ==============================================================================
-- Run this ONCE and it's DONE
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- STEP 1: FORCE CAP TABLE TO EXACT VALUES
-- ==============================================================================

UPDATE public.cap_tables
SET 
  total_authorized = 70000000,
  total_issued = 55300000,
  total_unissued = 14700000,
  trust_shares = 40600000,
  founder_shares = 10500000,
  equity_pool = 14700000,
  trust_percentage = 58.00,
  founder_percentage = 15.00,
  pool_percentage = 21.00,
  updated_at = NOW()
WHERE id = (SELECT id FROM public.cap_tables LIMIT 1);

-- ==============================================================================
-- STEP 2: FORCE INVERO, INC. TO 40.6M SHARES
-- ==============================================================================

-- First, try to update existing trust/holding company record
UPDATE public.employee_equity
SET 
  shareholder_name = 'Invero, Inc.',
  shareholder_type = 'entity',
  shares_total = 40600000,
  shares_percentage = 58.00,
  is_majority_shareholder = true,
  strike_price = 0.00,
  vesting_schedule = '{"type": "immediate"}'::jsonb,
  share_class = 'Common',
  updated_at = NOW()
WHERE (
  shareholder_name ILIKE '%trust%' 
  OR shareholder_name ILIKE '%invero%' 
  OR is_majority_shareholder = true
)
AND employee_id IS NULL;

-- If no record was updated, insert it
INSERT INTO public.employee_equity (
  employee_id,
  shareholder_name,
  shareholder_type,
  shares_total,
  shares_percentage,
  is_majority_shareholder,
  strike_price,
  vesting_schedule,
  equity_type,
  share_class,
  grant_date
)
SELECT 
  NULL,
  'Invero, Inc.',
  'entity',
  40600000,
  58.00,
  true,
  0.00,
  '{"type": "immediate"}'::jsonb,
  'Common Stock',
  'Common',
  CURRENT_DATE
WHERE NOT EXISTS (
  SELECT 1 FROM public.employee_equity 
  WHERE shareholder_name = 'Invero, Inc.'
);

-- Remove any duplicate Invero, Inc. records (keep only the latest)
DELETE FROM public.employee_equity
WHERE shareholder_name = 'Invero, Inc.'
AND id NOT IN (
  SELECT id FROM public.employee_equity
  WHERE shareholder_name = 'Invero, Inc.'
  ORDER BY updated_at DESC
  LIMIT 1
);

-- ==============================================================================
-- STEP 3: FORCE TORRANCE STROMAN TO 10.5M SHARES
-- ==============================================================================

UPDATE public.employee_equity
SET 
  shares_total = 10500000,
  shares_percentage = 15.00,
  strike_price = 0.00,
  vesting_schedule = '{"type": "immediate"}'::jsonb,
  equity_type = 'Common Stock',
  share_class = 'Common',
  updated_at = NOW()
WHERE (
  employee_id IN (
    SELECT e.id FROM public.employees e
    JOIN auth.users u ON e.user_id = u.id
    WHERE u.email = 'tstroman.ceo@cravenusa.com'
  )
  OR shareholder_name ILIKE '%torrance%stroman%'
);

-- ==============================================================================
-- STEP 4: FORCE JUSTIN SWEET TO 4.2M SHARES
-- ==============================================================================

-- Update vesting schedules
UPDATE public.vesting_schedules
SET 
  total_shares = 4200000,
  vested_shares = 4200000,
  unvested_shares = 0,
  vesting_schedule = jsonb_build_array(
    jsonb_build_object(
      'date', CURRENT_DATE,
      'shares', 4200000,
      'vested', true
    )
  ),
  updated_at = NOW()
WHERE recipient_user_id = (
  SELECT id FROM auth.users WHERE email = 'jsweet.cfo@cravenusa.com' LIMIT 1
);

-- Update equity ledger
UPDATE public.equity_ledger
SET 
  shares_amount = 4200000,
  notes = 'Equity: 4,200,000 shares to Justin Sweet (CFO), immediate vesting',
  updated_at = NOW()
WHERE recipient_user_id = (
  SELECT id FROM auth.users WHERE email = 'jsweet.cfo@cravenusa.com' LIMIT 1
)
AND transaction_type = 'grant';

-- ==============================================================================
-- STEP 5: UPDATE TRUSTS TABLE (IF EXISTS)
-- ==============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'trusts'
  ) THEN
    UPDATE public.trusts
    SET 
      name = 'Invero, Inc.',
      type = 'Corporate Entity',
      updated_at = NOW()
    WHERE name ILIKE '%trust%' OR name ILIKE '%invero%';
  END IF;
END $$;

COMMIT;

-- ==============================================================================
-- VERIFICATION - SHOW FINAL STATE
-- ==============================================================================

SELECT 'CAP TABLE (FINAL)' as section;

SELECT 
  total_authorized as authorized,
  total_issued as issued,
  total_unissued as unissued,
  trust_shares as invero_inc,
  founder_shares as torrance,
  equity_pool as pool,
  trust_percentage as invero_pct,
  founder_percentage as torrance_pct,
  pool_percentage as pool_pct
FROM public.cap_tables
LIMIT 1;

SELECT 'SHAREHOLDERS (FINAL)' as section;

SELECT 
  COALESCE(shareholder_name, e.first_name || ' ' || e.last_name) as name,
  eq.shares_total as shares,
  eq.shares_percentage as percentage,
  eq.shareholder_type as type
FROM public.employee_equity eq
LEFT JOIN public.employees e ON eq.employee_id = e.id
WHERE eq.shares_total > 0
ORDER BY eq.shares_percentage DESC;

SELECT 'JUSTIN SWEET (LEDGER)' as section;

SELECT 
  shares_amount as shares,
  notes,
  updated_at
FROM public.equity_ledger
WHERE recipient_user_id = (
  SELECT id FROM auth.users WHERE email = 'jsweet.cfo@cravenusa.com' LIMIT 1
)
AND transaction_type = 'grant'
ORDER BY updated_at DESC
LIMIT 1;

SELECT '✅ DONE - CAP TABLE FORCED TO EXACT VALUES' as status;

