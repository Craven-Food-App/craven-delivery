-- Revoke Nathan Curry's 500,000 shares and fix cap table
-- Nathan Curry has been fired and his shares must be revoked

DO $$
DECLARE
  nathan_user_id UUID;
  nathan_grants RECORD;
  total_revoked BIGINT := 0;
  cap_table_id UUID;
  cap_table_authorized BIGINT;
  trust_shares_val BIGINT;
  founder_shares_val BIGINT;
  grants_from_ledger BIGINT;
  total_issued_calculated BIGINT;
  total_unissued_calculated BIGINT;
BEGIN
  -- Find Nathan Curry's user ID
  SELECT id INTO nathan_user_id
  FROM auth.users
  WHERE email = 'natecurry.cto@cravenusa.com'
  LIMIT 1;

  IF nathan_user_id IS NULL THEN
    RAISE NOTICE 'Nathan Curry user not found, skipping revocation';
  ELSE
    RAISE NOTICE 'Found Nathan Curry user: %', nathan_user_id;

    -- Find all grants for Nathan
    FOR nathan_grants IN
      SELECT id, shares_amount, share_class, transaction_date, grant_id
      FROM public.equity_ledger
      WHERE recipient_user_id = nathan_user_id
        AND transaction_type = 'grant'
    LOOP
      -- Create revocation entry
      INSERT INTO public.equity_ledger (
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
        nathan_grants.shares_amount,
        nathan_grants.share_class,
        0.0001,
        CURRENT_DATE,
        CURRENT_DATE,
        nathan_grants.grant_id,
        'Equity revocation: ' || nathan_grants.shares_amount || ' shares revoked due to termination of employment. Nathan Curry has been exited and fired.'
      );

      total_revoked := total_revoked + nathan_grants.shares_amount;
      RAISE NOTICE 'Revoked % shares from grant %', nathan_grants.shares_amount, nathan_grants.id;
    END LOOP;

    -- Log in governance_logs (using correct column names: action, entity_type, entity_id, data)
    INSERT INTO public.governance_logs (
      action,
      entity_type,
      entity_id,
      description,
      data
    ) VALUES (
      'equity_revoked',
      'user',
      nathan_user_id,
      'Revoked ' || total_revoked || ' shares from Nathan Curry due to termination of employment',
      jsonb_build_object(
        'shares_revoked', total_revoked,
        'target_name', 'Nathan Curry',
        'reason', 'Termination of employment - Nathan Curry has been exited and fired',
        'action_category', 'equity'
      )
    );

    RAISE NOTICE 'Total shares revoked from Nathan Curry: %', total_revoked;
  END IF;

  -- Recalculate cap table correctly
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
  FROM public.cap_tables
  LIMIT 1;

  IF cap_table_id IS NULL THEN
    RAISE EXCEPTION 'No cap table found';
  END IF;

  -- Calculate total grants from equity_ledger (only 'grant' type, not 'cancellation')
  SELECT COALESCE(SUM(shares_amount), 0) INTO grants_from_ledger
  FROM public.equity_ledger
  WHERE transaction_type = 'grant';

  -- Total issued = Trust + Founder + Grants from ledger
  total_issued_calculated := COALESCE(trust_shares_val, 0) + COALESCE(founder_shares_val, 0) + grants_from_ledger;

  -- Total unissued = Authorized - Total Issued
  total_unissued_calculated := cap_table_authorized - total_issued_calculated;

  RAISE NOTICE 'Cap table recalculation:';
  RAISE NOTICE '  Total authorized: %', cap_table_authorized;
  RAISE NOTICE '  Trust shares (already issued): %', trust_shares_val;
  RAISE NOTICE '  Founder shares (already issued): %', founder_shares_val;
  RAISE NOTICE '  Grants from ledger: %', grants_from_ledger;
  RAISE NOTICE '  Total issued (calculated): %', total_issued_calculated;
  RAISE NOTICE '  Total unissued (calculated): %', total_unissued_calculated;

  -- Update cap table
  UPDATE public.cap_tables
  SET 
    total_issued = total_issued_calculated,
    total_unissued = total_unissued_calculated,
    updated_at = NOW()
  WHERE id = cap_table_id;

  RAISE NOTICE 'Cap table updated successfully';
  RAISE NOTICE 'Nathan Curry shares revoked and cap table recalculated';
END $$;

