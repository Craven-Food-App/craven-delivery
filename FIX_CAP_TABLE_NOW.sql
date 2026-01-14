-- FIX EVERYTHING - Run this directly in Supabase SQL Editor
-- This will: Revoke Nathan's shares, create Justin's grant, fix cap table

DO $$
DECLARE
  nathan_user_id UUID;
  justin_user_id UUID;
  nathan_grant_id UUID;
  justin_vesting_id UUID;
  total_revoked BIGINT := 0;
  cap_table_id UUID;
  cap_table_authorized BIGINT;
  trust_shares_val BIGINT;
  founder_shares_val BIGINT;
  grants_from_ledger BIGINT;
  total_issued_calculated BIGINT;
  total_unissued_calculated BIGINT;
BEGIN
  -- Find Nathan's user_id
  SELECT id INTO nathan_user_id
  FROM auth.users
  WHERE email = 'natecurry.cto@cravenusa.com'
  LIMIT 1;

  -- Find Justin's user_id
  SELECT id INTO justin_user_id
  FROM auth.users
  WHERE email = 'jsweet.cfo@cravenusa.com'
  LIMIT 1;

  RAISE NOTICE 'Nathan user_id: %', nathan_user_id;
  RAISE NOTICE 'Justin user_id: %', justin_user_id;

  -- STEP 1: Revoke Nathan's 500K shares
  IF nathan_user_id IS NOT NULL THEN
    -- Find Nathan's grant in equity_grants (500K shares)
    SELECT id INTO nathan_grant_id
    FROM equity_grants
    WHERE shares_total = 500000
      AND (executive_id IN (SELECT id FROM exec_users WHERE user_id = nathan_user_id)
           OR employee_id IN (SELECT id FROM employees WHERE user_id = nathan_user_id))
    LIMIT 1;

    -- Also check equity_ledger
    FOR nathan_grant_id IN
      SELECT grant_id FROM equity_ledger
      WHERE recipient_user_id = nathan_user_id
        AND transaction_type = 'grant'
        AND shares_amount = 500000
    LOOP
      -- Create revocation entry
      INSERT INTO equity_ledger (
        transaction_type,
        recipient_user_id,
        shares_amount,
        share_class,
        price_per_share,
        transaction_date,
        effective_date,
        grant_id,
        notes
      ) VALUES (
        'cancellation',
        nathan_user_id,
        500000,
        'Common',
        0.0001,
        CURRENT_DATE,
        CURRENT_DATE,
        nathan_grant_id,
        'Equity revocation: 500,000 shares revoked due to termination of employment. Nathan Curry has been exited and fired.'
      );

      total_revoked := 500000;
      EXIT; -- Only revoke once
    END LOOP;

    -- If no ledger entry, create revocation from equity_grants
    IF total_revoked = 0 AND nathan_grant_id IS NOT NULL THEN
      INSERT INTO equity_ledger (
        transaction_type,
        recipient_user_id,
        shares_amount,
        share_class,
        price_per_share,
        transaction_date,
        effective_date,
        grant_id,
        notes
      ) VALUES (
        'cancellation',
        nathan_user_id,
        500000,
        'Common',
        0.0001,
        CURRENT_DATE,
        CURRENT_DATE,
        nathan_grant_id,
        'Equity revocation: 500,000 shares revoked due to termination of employment. Nathan Curry has been exited and fired.'
      );

      total_revoked := 500000;
    END IF;

    -- Log revocation
    IF total_revoked > 0 THEN
      INSERT INTO governance_logs (
        action,
        entity_type,
        entity_id,
        description,
        data
      ) VALUES (
        'equity_revoked',
        'user',
        nathan_user_id,
        'Revoked 500,000 shares from Nathan Curry due to termination of employment',
        jsonb_build_object(
          'shares_revoked', 500000,
          'target_name', 'Nathan Curry',
          'reason', 'Termination of employment - Nathan Curry has been exited and fired',
          'action_category', 'equity'
        )
      );
      RAISE NOTICE 'Revoked 500,000 shares from Nathan Curry';
    END IF;
  END IF;

  -- STEP 2: Create Justin's 5M grant if it doesn't exist
  IF justin_user_id IS NOT NULL THEN
    -- Check if 5M grant exists
    IF NOT EXISTS (
      SELECT 1 FROM equity_ledger
      WHERE recipient_user_id = justin_user_id
        AND transaction_type = 'grant'
        AND shares_amount >= 4500000
        AND shares_amount <= 5500000
    ) THEN
      RAISE NOTICE 'Creating Justin Sweet 5M grant...';

      -- Create vesting schedule
      INSERT INTO vesting_schedules (
        recipient_user_id,
        total_shares,
        vesting_type,
        cliff_months,
        vesting_period_months,
        vesting_schedule,
        start_date,
        end_date,
        vested_shares,
        unvested_shares
      ) VALUES (
        justin_user_id,
        5000000,
        'immediate',
        0,
        0,
        jsonb_build_array(
          jsonb_build_object(
            'date', CURRENT_DATE,
            'shares', 5000000,
            'vested', true
          )
        ),
        CURRENT_DATE,
        CURRENT_DATE,
        5000000,
        0
      ) RETURNING id INTO justin_vesting_id;

      -- Create equity ledger entry
      INSERT INTO equity_ledger (
        transaction_type,
        recipient_user_id,
        shares_amount,
        share_class,
        price_per_share,
        transaction_date,
        effective_date,
        grant_id,
        notes
      ) VALUES (
        'grant',
        justin_user_id,
        5000000,
        'Common',
        0.0001,
        CURRENT_DATE,
        CURRENT_DATE,
        justin_vesting_id,
        'Equity grant: 5,000,000 shares to Justin Sweet (CFO), immediate vesting'
      );

      -- Log grant
      INSERT INTO governance_logs (
        action,
        entity_type,
        entity_id,
        description,
        data
      ) VALUES (
        'equity_granted',
        'user',
        justin_user_id,
        'Granted 5,000,000 shares to Justin Sweet (CFO)',
        jsonb_build_object(
          'shares_granted', 5000000,
          'share_class', 'Common',
          'vesting_type', 'immediate',
          'target_name', 'Justin Sweet',
          'action_category', 'equity'
        )
      );

      RAISE NOTICE 'Created Justin Sweet 5M grant';
    ELSE
      RAISE NOTICE 'Justin Sweet 5M grant already exists';
    END IF;
  END IF;

  -- STEP 3: Recalculate cap table
  SELECT 
    id, 
    total_authorized, 
    trust_shares, 
    founder_shares
  INTO 
    cap_table_id,
    cap_table_authorized,
    trust_shares_val,
    founder_shares_val
  FROM cap_tables
  LIMIT 1;

  IF cap_table_id IS NOT NULL THEN
    -- Calculate grants from ledger (only 'grant' type, NOT 'cancellation')
    SELECT COALESCE(SUM(shares_amount), 0) INTO grants_from_ledger
    FROM equity_ledger
    WHERE transaction_type = 'grant';

    -- Total issued = Trust + Founder + Grants from ledger
    total_issued_calculated := COALESCE(trust_shares_val, 0) + COALESCE(founder_shares_val, 0) + grants_from_ledger;

    -- Total unissued = Authorized - Total Issued
    total_unissued_calculated := cap_table_authorized - total_issued_calculated;

    RAISE NOTICE 'Cap table calculation:';
    RAISE NOTICE '  Total authorized: %', cap_table_authorized;
    RAISE NOTICE '  Trust shares: %', trust_shares_val;
    RAISE NOTICE '  Founder shares: %', founder_shares_val;
    RAISE NOTICE '  Grants from ledger: %', grants_from_ledger;
    RAISE NOTICE '  Total issued: %', total_issued_calculated;
    RAISE NOTICE '  Total unissued: %', total_unissued_calculated;

    -- Update cap table
    UPDATE cap_tables
    SET 
      total_issued = total_issued_calculated,
      total_unissued = total_unissued_calculated,
      updated_at = NOW()
    WHERE id = cap_table_id;

    RAISE NOTICE 'Cap table updated successfully';
  END IF;

  RAISE NOTICE 'DONE: Fixed everything!';
END $$;




















