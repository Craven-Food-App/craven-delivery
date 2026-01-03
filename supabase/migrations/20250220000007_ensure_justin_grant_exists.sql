-- Ensure Justin Sweet's 5,000,000 shares grant exists
-- If it doesn't exist in equity_ledger, create it

DO $$
DECLARE
  justin_user_id UUID;
  justin_grant_exists BOOLEAN := false;
  justin_grant_id UUID;
  vesting_schedule_id UUID;
BEGIN
  -- Find Justin Sweet's user ID
  SELECT id INTO justin_user_id
  FROM auth.users
  WHERE email = 'jsweet.cfo@cravenusa.com'
  LIMIT 1;

  IF justin_user_id IS NULL THEN
    RAISE NOTICE 'Justin Sweet user not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found Justin Sweet user: %', justin_user_id;

  -- Check if 5M grant already exists in equity_ledger
  SELECT EXISTS(
    SELECT 1 
    FROM public.equity_ledger
    WHERE recipient_user_id = justin_user_id
      AND transaction_type = 'grant'
      AND shares_amount >= 4500000
      AND shares_amount <= 5500000
  ) INTO justin_grant_exists;

  IF justin_grant_exists THEN
    RAISE NOTICE 'Justin Sweet 5M grant already exists in equity_ledger';
    RETURN;
  END IF;

  RAISE NOTICE 'Justin Sweet 5M grant NOT found, creating it...';

  -- Create vesting schedule for Justin
  INSERT INTO public.vesting_schedules (
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
  ) RETURNING id INTO vesting_schedule_id;

  RAISE NOTICE 'Created vesting schedule for Justin: %', vesting_schedule_id;

  -- Create equity ledger entry for Justin's 5M grant
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
    'grant',
    justin_user_id,
    5000000,
    'Common',
    0.0001,
    CURRENT_DATE,
    CURRENT_DATE,
    vesting_schedule_id,
    'Equity grant: 5,000,000 shares to Justin Sweet (CFO), immediate vesting'
  ) RETURNING id INTO justin_grant_id;

  RAISE NOTICE 'Created equity ledger entry for Justin: %', justin_grant_id;

  -- Log in governance_logs (using correct column names: action, entity_type, entity_id, data)
  INSERT INTO public.governance_logs (
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

  RAISE NOTICE 'Justin Sweet 5M grant created successfully';
END $$;

