-- UPDATE JUSTIN SWEET'S VESTING SCHEDULE
-- Change from immediate vesting to 4-year vesting with 1-year cliff
-- Standard startup vesting schedule:
--   - 1-year cliff (12 months): No shares vest for first 12 months
--   - At month 12: 25% (1,050,000 shares) vests at the cliff
--   - Months 13-48: Remaining 75% (3,150,000 shares) vests monthly over 36 months
--   - Monthly vest amount: 87,500 shares per month

DO $$
DECLARE
  justin_user_id UUID;
  justin_vesting_id UUID;
  grant_date DATE;
  cliff_date DATE;
  vesting_end_date DATE;
  monthly_vest_amount BIGINT;
  vesting_schedule_array JSONB := '[]'::jsonb;
  i INTEGER;
  vest_date DATE;
BEGIN
  -- Find Justin Sweet's user_id
  SELECT id INTO justin_user_id
  FROM auth.users
  WHERE email = 'jsweet.cfo@cravenusa.com'
  LIMIT 1;

  IF justin_user_id IS NULL THEN
    RAISE NOTICE 'Justin Sweet user not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found Justin Sweet user_id: %', justin_user_id;

  -- Get the grant date from equity_ledger
  SELECT transaction_date INTO grant_date
  FROM equity_ledger
  WHERE recipient_user_id = justin_user_id
    AND transaction_type = 'grant'
    AND shares_amount >= 4000000
    AND shares_amount <= 5000000
  ORDER BY transaction_date ASC
  LIMIT 1;

  IF grant_date IS NULL THEN
    grant_date := CURRENT_DATE;
    RAISE NOTICE 'No grant date found, using current date: %', grant_date;
  ELSE
    RAISE NOTICE 'Using grant date: %', grant_date;
  END IF;

  -- Calculate dates
  cliff_date := grant_date + INTERVAL '12 months';
  vesting_end_date := grant_date + INTERVAL '48 months'; -- 4 years total

  -- Get current vesting schedule ID
  SELECT id INTO justin_vesting_id
  FROM vesting_schedules
  WHERE recipient_user_id = justin_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Calculate monthly vest amount (75% of shares over 36 months after cliff)
  -- Total shares: 4,200,000
  -- Cliff: 1,050,000 shares (25%) at month 12
  -- Monthly after cliff: 3,150,000 / 36 = 87,500 shares per month
  monthly_vest_amount := 87500; -- 3,150,000 / 36 months

  -- Build vesting schedule array
  -- Month 12: Cliff - 25% (1,050,000 shares)
  vesting_schedule_array := jsonb_build_array(
    jsonb_build_object(
      'date', cliff_date::text,
      'shares', 1050000,
      'vested', false
    )
  );

  -- Months 13-48: Monthly vesting of remaining 75% (87,500 shares per month)
  FOR i IN 1..36 LOOP
    vest_date := cliff_date + (i || ' months')::INTERVAL;
    vesting_schedule_array := vesting_schedule_array || jsonb_build_array(
      jsonb_build_object(
        'date', vest_date::text,
        'shares', monthly_vest_amount,
        'vested', false
      )
    );
  END LOOP;

  IF justin_vesting_id IS NOT NULL THEN
    -- Update existing vesting schedule
    UPDATE vesting_schedules
    SET 
      vesting_type = 'graded',
      cliff_months = 12,
      vesting_period_months = 48,
      vesting_schedule = vesting_schedule_array,
      start_date = grant_date,
      end_date = vesting_end_date,
      vested_shares = 0, -- No shares vested yet (assuming grant is recent)
      unvested_shares = 4200000,
      updated_at = NOW()
    WHERE id = justin_vesting_id;

    RAISE NOTICE 'Updated vesting schedule for Justin Sweet';
    RAISE NOTICE '  - Type: 4-year graded with 1-year cliff';
    RAISE NOTICE '  - Cliff: 1,050,000 shares (25%%) at month 12';
    RAISE NOTICE '  - Monthly: 87,500 shares per month for 36 months';
    RAISE NOTICE '  - Total: 4,200,000 shares over 48 months';
  ELSE
    -- Create new vesting schedule
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
      4200000,
      'graded',
      12,
      48,
      vesting_schedule_array,
      grant_date,
      vesting_end_date,
      0,
      4200000
    ) RETURNING id INTO justin_vesting_id;

    RAISE NOTICE 'Created new vesting schedule for Justin Sweet';
    RAISE NOTICE '  - Type: 4-year graded with 1-year cliff';
    RAISE NOTICE '  - Cliff: 1,050,000 shares (25%%) at month 12';
    RAISE NOTICE '  - Monthly: 87,500 shares per month for 36 months';
  END IF;

END $$;

-- Verify the update
SELECT 
  'VERIFICATION - JUSTIN SWEET VESTING' as info,
  vs.id,
  vs.vesting_type,
  vs.cliff_months,
  vs.vesting_period_months,
  vs.total_shares,
  vs.vested_shares,
  vs.unvested_shares,
  vs.start_date,
  vs.end_date,
  up.full_name,
  up.email
FROM vesting_schedules vs
JOIN auth.users au ON vs.recipient_user_id = au.id
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.email = 'jsweet.cfo@cravenusa.com'
ORDER BY vs.created_at DESC
LIMIT 1;

