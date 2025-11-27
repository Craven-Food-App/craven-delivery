-- UPDATE TORRANCE STROMAN EQUITY TO MATCH CAP TABLE
-- Torrance Stroman: 18,000,000 shares, 18%, $0.00 strike price, No vesting (Immediate)

-- Step 1: Update cap_tables to reflect correct distribution
UPDATE public.cap_tables
SET 
  total_authorized = 100000000,
  total_issued = 87000000,  -- 55M (trust) + 18M (founder) + 14M (equity pool)
  total_unissued = 13000000,
  equity_pool = 14000000,
  trust_shares = 55000000,
  founder_shares = 18000000,
  trust_percentage = 55.00,
  founder_percentage = 18.00,
  pool_percentage = 14.00,
  par_value = 0.0001,
  as_of_date = CURRENT_DATE,
  updated_at = NOW()
WHERE id IN (SELECT id FROM public.cap_tables LIMIT 1);

-- Step 2: Update or Insert Invero Business Trust equity record
INSERT INTO public.employee_equity (
  id,
  employee_id,
  shares_total,
  shares_percentage,
  equity_type,
  strike_price,
  vesting_schedule,
  grant_date,
  shareholder_name,
  shareholder_type,
  is_majority_shareholder,
  share_class,
  consideration_type
)
VALUES (
  'invero-trust-55-percent',
  NULL,
  55000000,
  55.00,
  'Common Stock',
  0.00,
  '{"type": "immediate"}',
  CURRENT_DATE,
  'Invero Business Trust',
  'trust',
  true,
  'Common',
  'Cash'
)
ON CONFLICT (id) DO UPDATE SET
  shares_total = 55000000,
  shares_percentage = 55.00,
  strike_price = 0.00,
  vesting_schedule = '{"type": "immediate"}',
  shareholder_name = 'Invero Business Trust',
  is_majority_shareholder = true,
  updated_at = NOW();

-- Step 3: Find Torrance Stroman's employee_id
DO $$
DECLARE
  torrance_employee_id UUID;
  torrance_equity_id UUID := '684f7d11-6551-45b8-a468-f5699fdc4025';
BEGIN
  -- Find Torrance's employee record
  SELECT id INTO torrance_employee_id
  FROM public.employees
  WHERE (LOWER(first_name) = 'torrance' AND LOWER(last_name) = 'stroman')
     OR email ILIKE '%torrance%stroman%'
     OR email = 'tstroman.ceo@cravenusa.com'
  LIMIT 1;

  IF torrance_employee_id IS NOT NULL THEN
    -- Update Torrance's equity record
    INSERT INTO public.employee_equity (
      id,
      employee_id,
      shares_total,
      shares_percentage,
      equity_type,
      strike_price,
      vesting_schedule,
      grant_date,
      share_class,
      consideration_type
    )
    VALUES (
      torrance_equity_id,
      torrance_employee_id,
      18000000,
      18.00,
      'Common Stock',
      0.00,
      '{"type": "immediate"}',
      CURRENT_DATE,
      'Common',
      'Founder IP + Services'
    )
    ON CONFLICT (id) DO UPDATE SET
      employee_id = torrance_employee_id,
      shares_total = 18000000,
      shares_percentage = 18.00,
      strike_price = 0.00,
      vesting_schedule = '{"type": "immediate"}',
      equity_type = 'Common Stock',
      share_class = 'Common',
      consideration_type = 'Founder IP + Services',
      grant_date = CURRENT_DATE,
      updated_at = NOW();
    
    RAISE NOTICE 'Updated Torrance Stroman equity: 18,000,000 shares (18%%), $0.00 strike price, No vesting';
  ELSE
    RAISE WARNING 'Could not find Torrance Stroman employee record';
  END IF;
END $$;

-- Step 4: Verify the updates
SELECT 
  COALESCE(e.first_name || ' ' || e.last_name, eq.shareholder_name) AS name,
  eq.shares_total,
  eq.shares_percentage,
  eq.strike_price,
  eq.vesting_schedule,
  eq.equity_type,
  eq.share_class
FROM public.employee_equity eq
LEFT JOIN public.employees e ON eq.employee_id = e.id
WHERE eq.id IN ('invero-trust-55-percent', '684f7d11-6551-45b8-a468-f5699fdc4025')
   OR eq.shareholder_name = 'Invero Business Trust'
   OR (e.first_name ILIKE '%torrance%' AND e.last_name ILIKE '%stroman%')
ORDER BY eq.shares_percentage DESC;

-- Step 5: Verify cap table totals
SELECT 
  total_authorized,
  total_issued,
  total_unissued,
  trust_shares,
  founder_shares,
  equity_pool,
  trust_percentage,
  founder_percentage,
  pool_percentage
FROM public.cap_tables
LIMIT 1;
