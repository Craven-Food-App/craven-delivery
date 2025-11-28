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
DO $$
DECLARE
  trust_record_id UUID;
BEGIN
  -- Check if Invero Business Trust record already exists
  SELECT id INTO trust_record_id
  FROM public.employee_equity
  WHERE shareholder_name = 'Invero Business Trust'
    AND employee_id IS NULL
  LIMIT 1;

  IF trust_record_id IS NOT NULL THEN
    -- Update existing record
    UPDATE public.employee_equity
    SET
      shares_total = 55000000,
      shares_percentage = 55.00,
      strike_price = 0.00,
      vesting_schedule = '{"type": "immediate"}'::jsonb,
      shareholder_name = 'Invero Business Trust',
      shareholder_type = 'trust',
      is_majority_shareholder = true,
      share_class = 'Common',
      consideration_type = 'Cash',
      updated_at = NOW()
    WHERE id = trust_record_id;
  ELSE
    -- Insert new record
    INSERT INTO public.employee_equity (
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
      NULL,
      55000000,
      55.00,
      'Common Stock',
      0.00,
      '{"type": "immediate"}'::jsonb,
      CURRENT_DATE,
      'Invero Business Trust',
      'trust',
      true,
      'Common',
      'Cash'
    );
  END IF;
END $$;

-- Step 3: Update equity_ledger and employee_equity for Torrance Stroman
DO $$
DECLARE
  torrance_employee_id UUID;
  torrance_user_id UUID;
  torrance_email TEXT := 'tstroman.ceo@cravenusa.com';
  torrance_full_name TEXT := 'Torrance Stroman';
  torrance_equity_id UUID := '684f7d11-6551-45b8-a468-f5699fdc4025';
  existing_ledger_id UUID;
  torrance_exec_id UUID;
BEGIN
  -- Find Torrance's user_id from auth.users
  SELECT id INTO torrance_user_id
  FROM auth.users
  WHERE email = torrance_email
     OR email ILIKE '%torrance%stroman%'
  LIMIT 1;

  -- Find Torrance's employee record
  SELECT id, user_id INTO torrance_employee_id, torrance_user_id
  FROM public.employees
  WHERE (LOWER(first_name) = 'torrance' AND LOWER(last_name) = 'stroman')
     OR email ILIKE '%torrance%stroman%'
     OR email = torrance_email
     OR user_id = torrance_user_id
  LIMIT 1;

  -- Ensure user_profiles has correct data
  IF torrance_user_id IS NOT NULL THEN
    INSERT INTO public.user_profiles (user_id, email, full_name, role)
    VALUES (torrance_user_id, torrance_email, torrance_full_name, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET
      email = torrance_email,
      full_name = torrance_full_name,
      updated_at = NOW();
    
    RAISE NOTICE 'Updated user_profiles for Torrance Stroman';
  END IF;

  IF torrance_user_id IS NOT NULL THEN
    -- Check if equity_ledger entry exists
    SELECT id INTO existing_ledger_id
    FROM public.equity_ledger
    WHERE recipient_user_id = torrance_user_id
      AND transaction_type = 'grant'
    LIMIT 1;

    IF existing_ledger_id IS NOT NULL THEN
      -- Update existing equity_ledger entry
      UPDATE public.equity_ledger
      SET
        shares_amount = 18000000,
        share_class = 'Common',
        updated_at = NOW()
      WHERE id = existing_ledger_id;
      
      RAISE NOTICE 'Updated existing equity_ledger for Torrance Stroman: 18,000,000 shares';
    ELSE
      -- Insert new equity_ledger entry
      INSERT INTO public.equity_ledger (
        recipient_user_id,
        transaction_type,
        shares_amount,
        share_class,
        transaction_date,
        effective_date
      )
      VALUES (
        torrance_user_id,
        'grant',
        18000000,
        'Common',
        CURRENT_DATE,
        CURRENT_DATE
      );
      
      RAISE NOTICE 'Created new equity_ledger entry for Torrance Stroman: 18,000,000 shares';
    END IF;
    
    -- Update vesting_schedules
    UPDATE public.vesting_schedules
    SET
      vesting_type = 'immediate',
      vested_shares = 18000000,
      unvested_shares = 0,
      total_shares = 18000000,
      vesting_period_months = 0,
      updated_at = NOW()
    WHERE recipient_user_id = torrance_user_id;

    -- If no vesting schedule exists, create one
    IF NOT EXISTS (
      SELECT 1 FROM public.vesting_schedules WHERE recipient_user_id = torrance_user_id
    ) THEN
      INSERT INTO public.vesting_schedules (
        recipient_user_id,
        vesting_type,
        total_shares,
        vested_shares,
        unvested_shares,
        vesting_period_months,
        start_date,
        vesting_schedule
      )
      VALUES (
        torrance_user_id,
        'immediate',
        18000000,
        18000000,
        0,
        0,
        CURRENT_DATE,
        '[]'::jsonb
      );
    END IF;
    
    RAISE NOTICE 'Updated vesting_schedules for Torrance Stroman';
    
    -- Update share_certificates
    UPDATE public.share_certificates
    SET
      shares_amount = 18000000,
      share_class = 'Common',
      updated_at = NOW()
    WHERE recipient_user_id = torrance_user_id
      AND status = 'issued';
    
    RAISE NOTICE 'Updated share_certificates for Torrance Stroman: 18,000,000 shares';
    
    -- Update equity_grants if table exists and has records for Torrance
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'equity_grants') THEN
      -- Update by employee_id if exists
      IF torrance_employee_id IS NOT NULL THEN
        UPDATE public.equity_grants
        SET
          shares_total = 18000000,
          shares_percentage = 18.00
        WHERE employee_id = torrance_employee_id;
        
        RAISE NOTICE 'Updated equity_grants (by employee_id) for Torrance Stroman: 18,000,000 shares';
      END IF;
      
      -- Also try to update by executive_id (if Torrance has an exec_users record)
      SELECT id INTO torrance_exec_id
      FROM public.exec_users
      WHERE user_id = torrance_user_id
      LIMIT 1;
      
      IF torrance_exec_id IS NOT NULL THEN
        UPDATE public.equity_grants
        SET
          shares_total = 18000000,
          shares_percentage = 18.00
        WHERE executive_id = torrance_exec_id;
        
        RAISE NOTICE 'Updated equity_grants (by executive_id) for Torrance Stroman: 18,000,000 shares';
      END IF;
    END IF;
  ELSE
    RAISE WARNING 'Could not find Torrance Stroman user_id - cannot update equity_ledger';
  END IF;

  IF torrance_employee_id IS NOT NULL THEN
    -- Update Torrance's employee_equity record
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
      vesting_schedule = '{"type": "immediate"}'::jsonb,
      equity_type = 'Common Stock',
      share_class = 'Common',
      consideration_type = 'Founder IP + Services',
      grant_date = CURRENT_DATE,
      updated_at = NOW();
    
    RAISE NOTICE 'Updated Torrance Stroman employee_equity: 18,000,000 shares (18%%), $0.00 strike price, No vesting';
  ELSE
    RAISE WARNING 'Could not find Torrance Stroman employee record';
  END IF;
END $$;


-- Step 4: Verify the updates
-- Verify equity_ledger and user_profiles data
DO $$
DECLARE
  torrance_user_id UUID;
  torrance_email TEXT := 'tstroman.ceo@cravenusa.com';
  ledger_check RECORD;
  profile_check RECORD;
BEGIN
  -- Find Torrance's user_id
  SELECT id INTO torrance_user_id
  FROM auth.users
  WHERE email = torrance_email
  LIMIT 1;

  IF torrance_user_id IS NOT NULL THEN
    -- Check equity_ledger
    SELECT * INTO ledger_check
    FROM public.equity_ledger
    WHERE recipient_user_id = torrance_user_id
      AND transaction_type = 'grant'
    LIMIT 1;

    -- Check user_profiles
    SELECT * INTO profile_check
    FROM public.user_profiles
    WHERE user_id = torrance_user_id
    LIMIT 1;

    RAISE NOTICE '=== VERIFICATION RESULTS ===';
    RAISE NOTICE 'Torrance user_id: %', torrance_user_id;
    
    IF ledger_check IS NOT NULL THEN
      RAISE NOTICE 'equity_ledger: Found - shares_amount: %, share_class: %, recipient_user_id: %', 
        ledger_check.shares_amount, 
        ledger_check.share_class, 
        ledger_check.recipient_user_id;
    ELSE
      RAISE WARNING 'equity_ledger: NOT FOUND for user_id %', torrance_user_id;
    END IF;

    IF profile_check IS NOT NULL THEN
      RAISE NOTICE 'user_profiles: Found - email: %, full_name: %, user_id: %', 
        profile_check.email, 
        profile_check.full_name, 
        profile_check.user_id;
    ELSE
      RAISE WARNING 'user_profiles: NOT FOUND for user_id %', torrance_user_id;
    END IF;
  ELSE
    RAISE WARNING 'Torrance user_id NOT FOUND in auth.users with email: %', torrance_email;
  END IF;
END $$;

-- Display equity data
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
WHERE eq.id = '684f7d11-6551-45b8-a468-f5699fdc4025'
   OR eq.shareholder_name = 'Invero Business Trust'
   OR (e.first_name ILIKE '%torrance%' AND e.last_name ILIKE '%stroman%')
ORDER BY eq.shares_percentage DESC;

-- Step 5: Verify share_certificates
SELECT 
  sc.certificate_number,
  COALESCE(up.full_name, e.first_name || ' ' || e.last_name, 'Unknown') AS recipient_name,
  sc.shares_amount,
  sc.share_class,
  sc.issue_date,
  sc.status
FROM public.share_certificates sc
LEFT JOIN public.user_profiles up ON sc.recipient_user_id = up.user_id
LEFT JOIN public.employees e ON sc.recipient_user_id = e.user_id
WHERE sc.recipient_user_id IN (
  SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
)
ORDER BY sc.issue_date DESC;

-- Step 6: Verify cap table totals
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
