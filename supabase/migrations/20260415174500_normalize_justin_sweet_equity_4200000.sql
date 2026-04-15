-- Normalize Justin Sweet equity + vesting to canonical 4,200,000 shares.
-- Fixes vesting progress/schedule mismatches caused by historical 5,000,000-share rows.

DO $$
DECLARE
  v_justin_user_id uuid;
  v_today date := CURRENT_DATE;
  v_keep_ledger_id uuid;
  v_keep_vesting_id uuid;
BEGIN
  SELECT id INTO v_justin_user_id
  FROM auth.users
  WHERE lower(email) = 'jsweet.cfo@cravenusa.com'
  LIMIT 1;

  IF v_justin_user_id IS NULL THEN
    RAISE NOTICE 'Justin Sweet user not found, skipping equity normalization';
    RETURN;
  END IF;

  -- Keep a single grant-like ledger row in the 4.0M-5.5M band.
  SELECT id INTO v_keep_ledger_id
  FROM public.equity_ledger
  WHERE recipient_user_id = v_justin_user_id
    AND transaction_type = 'grant'
    AND shares_amount BETWEEN 4000000 AND 5500000
  ORDER BY
    CASE WHEN shares_amount = 4200000 THEN 0 ELSE 1 END,
    COALESCE(transaction_date, created_at::date) DESC,
    created_at DESC
  LIMIT 1;

  IF v_keep_ledger_id IS NULL THEN
    INSERT INTO public.equity_ledger (
      transaction_type,
      recipient_user_id,
      shares_amount,
      share_class,
      price_per_share,
      transaction_date,
      effective_date,
      notes
    ) VALUES (
      'grant',
      v_justin_user_id,
      4200000,
      'Common',
      0.001,
      v_today,
      v_today,
      'Equity grant: 4,200,000 shares to Justin Sweet (CFO), immediate vesting'
    )
    RETURNING id INTO v_keep_ledger_id;
  END IF;

  UPDATE public.equity_ledger
  SET shares_amount = 4200000,
      share_class = COALESCE(NULLIF(share_class, ''), 'Common'),
      price_per_share = COALESCE(price_per_share, 0.001),
      notes = COALESCE(notes, 'Equity grant: 4,200,000 shares to Justin Sweet (CFO), immediate vesting')
  WHERE id = v_keep_ledger_id;

  DELETE FROM public.equity_ledger
  WHERE recipient_user_id = v_justin_user_id
    AND transaction_type = 'grant'
    AND shares_amount BETWEEN 4000000 AND 5500000
    AND id <> v_keep_ledger_id;

  -- Keep a single vesting row in the same band.
  SELECT id INTO v_keep_vesting_id
  FROM public.vesting_schedules
  WHERE recipient_user_id = v_justin_user_id
    AND total_shares BETWEEN 4000000 AND 5500000
  ORDER BY
    CASE WHEN total_shares = 4200000 THEN 0 ELSE 1 END,
    COALESCE(start_date, created_at::date) DESC,
    created_at DESC
  LIMIT 1;

  IF v_keep_vesting_id IS NULL THEN
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
      v_justin_user_id,
      4200000,
      'immediate',
      0,
      0,
      jsonb_build_array(
        jsonb_build_object('date', v_today::text, 'shares', 4200000, 'vested', true)
      ),
      v_today,
      v_today,
      4200000,
      0
    )
    RETURNING id INTO v_keep_vesting_id;
  END IF;

  UPDATE public.vesting_schedules
  SET total_shares = 4200000,
      vesting_type = 'immediate',
      cliff_months = 0,
      vesting_period_months = 0,
      vesting_schedule = jsonb_build_array(
        jsonb_build_object('date', COALESCE(start_date, v_today)::text, 'shares', 4200000, 'vested', true)
      ),
      start_date = COALESCE(start_date, v_today),
      end_date = COALESCE(end_date, start_date, v_today),
      vested_shares = 4200000,
      unvested_shares = 0
  WHERE id = v_keep_vesting_id;

  DELETE FROM public.vesting_schedules
  WHERE recipient_user_id = v_justin_user_id
    AND total_shares BETWEEN 4000000 AND 5500000
    AND id <> v_keep_vesting_id;

  RAISE NOTICE 'Justin Sweet equity normalized to 4,200,000 shares';
END $$;
