-- Canonical cap table + equity dedupe
-- Targets:
-- - Authorized shares fixed at 70,000,000
-- - Invero, Inc. fixed at 40,600,000 (58%)
-- - Torrance fixed at 10,500,000 (15%)
-- - Justin fixed at 4,200,000 (6%)
-- - Jason fixed at 2,100,000 (3%) when user/exec records exist
-- - Micro pool fixed at 1,400,000
-- - Reserved non-micro pool derived from remaining unissued shares
-- - Remove duplicate grant rows for target users (ledger + equity_grants)

DO $$
DECLARE
  v_cap_table_id UUID;
  v_authorized BIGINT := 70000000;
  v_holding_shares BIGINT := 40600000;
  v_founder_shares BIGINT := 10500000;
  v_micro_pool BIGINT := 1400000;

  v_torrance_user_id UUID;
  v_justin_user_id UUID;
  v_jason_user_id UUID;

  v_torrance_exec_id UUID;
  v_justin_exec_id UUID;
  v_jason_exec_id UUID;

  v_keep_ledger UUID;
  v_keep_grant UUID;

  v_justin_shares BIGINT := 0;
  v_jason_shares BIGINT := 0;
  v_issued BIGINT;
  v_unissued BIGINT;
  v_reserved_pool BIGINT;
BEGIN
  SELECT id INTO v_cap_table_id
  FROM public.cap_tables
  ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  LIMIT 1;

  IF v_cap_table_id IS NULL THEN
    INSERT INTO public.cap_tables (
      total_authorized,
      par_value,
      total_issued,
      total_unissued,
      equity_pool,
      holding_company_shares,
      holding_company_percentage,
      founder_shares,
      founder_percentage,
      pool_percentage,
      micro_equity_pool,
      as_of_date
    )
    VALUES (
      v_authorized,
      0.001,
      0,
      v_authorized,
      v_authorized - v_micro_pool,
      0,
      0,
      0,
      0,
      0,
      v_micro_pool,
      CURRENT_DATE
    )
    RETURNING id INTO v_cap_table_id;
  END IF;

  SELECT id INTO v_torrance_user_id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com' LIMIT 1;
  SELECT id INTO v_justin_user_id FROM auth.users WHERE email = 'jsweet.cfo@cravenusa.com' LIMIT 1;
  SELECT id INTO v_jason_user_id FROM auth.users WHERE email = 'jparcell2022@gmail.com' LIMIT 1;

  SELECT id INTO v_torrance_exec_id FROM public.exec_users WHERE user_id = v_torrance_user_id ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_justin_exec_id FROM public.exec_users WHERE user_id = v_justin_user_id ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_jason_exec_id FROM public.exec_users WHERE user_id = v_jason_user_id ORDER BY created_at ASC LIMIT 1;

  -- Remove cancellation rows for target users so active grants are not unintentionally hidden.
  DELETE FROM public.equity_ledger
  WHERE transaction_type = 'cancellation'
    AND recipient_user_id IN (v_torrance_user_id, v_justin_user_id, v_jason_user_id);

  -- TORRANCE ledger canonicalization (10.5M)
  IF v_torrance_user_id IS NOT NULL THEN
    SELECT id INTO v_keep_ledger
    FROM public.equity_ledger
    WHERE recipient_user_id = v_torrance_user_id
      AND transaction_type = 'grant'
    ORDER BY transaction_date DESC, created_at DESC
    LIMIT 1;

    IF v_keep_ledger IS NULL THEN
      INSERT INTO public.equity_ledger (
        transaction_type, recipient_user_id, shares_amount, share_class, price_per_share, transaction_date, effective_date, notes
      )
      VALUES (
        'grant', v_torrance_user_id, 10500000, 'Common', 0.001, CURRENT_DATE, CURRENT_DATE,
        'Canonical founder grant (15% of 70M)'
      );
    ELSE
      UPDATE public.equity_ledger
      SET
        shares_amount = 10500000,
        share_class = 'Common',
        price_per_share = 0.001,
        transaction_date = CURRENT_DATE,
        effective_date = CURRENT_DATE,
        notes = 'Canonical founder grant (15% of 70M)',
        updated_at = NOW()
      WHERE id = v_keep_ledger;

      DELETE FROM public.equity_ledger
      WHERE recipient_user_id = v_torrance_user_id
        AND transaction_type = 'grant'
        AND id <> v_keep_ledger;
    END IF;
  END IF;

  -- JUSTIN ledger canonicalization (4.2M)
  IF v_justin_user_id IS NOT NULL THEN
    SELECT id INTO v_keep_ledger
    FROM public.equity_ledger
    WHERE recipient_user_id = v_justin_user_id
      AND transaction_type = 'grant'
    ORDER BY transaction_date DESC, created_at DESC
    LIMIT 1;

    IF v_keep_ledger IS NULL THEN
      INSERT INTO public.equity_ledger (
        transaction_type, recipient_user_id, shares_amount, share_class, price_per_share, transaction_date, effective_date, notes
      )
      VALUES (
        'grant', v_justin_user_id, 4200000, 'Common', 0.001, CURRENT_DATE, CURRENT_DATE,
        'Canonical CFO grant (6% of 70M)'
      );
    ELSE
      UPDATE public.equity_ledger
      SET
        shares_amount = 4200000,
        share_class = 'Common',
        price_per_share = 0.001,
        transaction_date = CURRENT_DATE,
        effective_date = CURRENT_DATE,
        notes = 'Canonical CFO grant (6% of 70M)',
        updated_at = NOW()
      WHERE id = v_keep_ledger;

      DELETE FROM public.equity_ledger
      WHERE recipient_user_id = v_justin_user_id
        AND transaction_type = 'grant'
        AND id <> v_keep_ledger;
    END IF;
    v_justin_shares := 4200000;
  END IF;

  -- JASON ledger canonicalization (2.1M) if user exists
  IF v_jason_user_id IS NOT NULL THEN
    SELECT id INTO v_keep_ledger
    FROM public.equity_ledger
    WHERE recipient_user_id = v_jason_user_id
      AND transaction_type = 'grant'
    ORDER BY transaction_date DESC, created_at DESC
    LIMIT 1;

    IF v_keep_ledger IS NULL THEN
      INSERT INTO public.equity_ledger (
        transaction_type, recipient_user_id, shares_amount, share_class, price_per_share, transaction_date, effective_date, notes
      )
      VALUES (
        'grant', v_jason_user_id, 2100000, 'Common', 0.001, CURRENT_DATE, CURRENT_DATE,
        'Canonical CPO grant (3% of 70M)'
      );
    ELSE
      UPDATE public.equity_ledger
      SET
        shares_amount = 2100000,
        share_class = 'Common',
        price_per_share = 0.001,
        transaction_date = CURRENT_DATE,
        effective_date = CURRENT_DATE,
        notes = 'Canonical CPO grant (3% of 70M)',
        updated_at = NOW()
      WHERE id = v_keep_ledger;

      DELETE FROM public.equity_ledger
      WHERE recipient_user_id = v_jason_user_id
        AND transaction_type = 'grant'
        AND id <> v_keep_ledger;
    END IF;
    v_jason_shares := 2100000;
  END IF;

  -- Equity grants table dedupe/canonicalization for target execs.
  -- Keep one active row per exec and revoke extras for audit preservation.
  IF v_torrance_exec_id IS NOT NULL THEN
    SELECT id INTO v_keep_grant
    FROM public.equity_grants
    WHERE executive_id = v_torrance_exec_id
    ORDER BY approved_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    IF v_keep_grant IS NULL THEN
      INSERT INTO public.equity_grants (
        executive_id, grant_date, shares_total, shares_percentage, share_class, strike_price,
        vesting_schedule, consideration_type, status, notes
      )
      VALUES (
        v_torrance_exec_id, CURRENT_DATE, 10500000, 15.00, 'Common', 0.001,
        '{"type":"immediate"}'::jsonb, 'founder_contribution', 'approved',
        'Canonical founder grant (15% of 70M)'
      );
    ELSE
      UPDATE public.equity_grants
      SET
        shares_total = 10500000,
        shares_percentage = 15.00,
        share_class = 'Common',
        strike_price = 0.001,
        vesting_schedule = '{"type":"immediate"}'::jsonb,
        consideration_type = 'founder_contribution',
        status = 'approved',
        notes = 'Canonical founder grant (15% of 70M)',
        approved_at = COALESCE(approved_at, NOW())
      WHERE id = v_keep_grant;

      UPDATE public.equity_grants
      SET status = 'revoked',
          notes = COALESCE(notes, '') || ' [revoked by canonical cap table dedupe]',
          approved_at = COALESCE(approved_at, NOW())
      WHERE executive_id = v_torrance_exec_id
        AND id <> v_keep_grant
        AND COALESCE(status, '') <> 'revoked';
    END IF;
  END IF;

  IF v_justin_exec_id IS NOT NULL THEN
    SELECT id INTO v_keep_grant
    FROM public.equity_grants
    WHERE executive_id = v_justin_exec_id
    ORDER BY approved_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    IF v_keep_grant IS NULL THEN
      INSERT INTO public.equity_grants (
        executive_id, grant_date, shares_total, shares_percentage, share_class, strike_price,
        vesting_schedule, consideration_type, status, notes
      )
      VALUES (
        v_justin_exec_id, CURRENT_DATE, 4200000, 6.00, 'Common', 0.001,
        '{"type":"immediate"}'::jsonb, 'executive_compensation', 'approved',
        'Canonical CFO grant (6% of 70M)'
      );
    ELSE
      UPDATE public.equity_grants
      SET
        shares_total = 4200000,
        shares_percentage = 6.00,
        share_class = 'Common',
        strike_price = 0.001,
        vesting_schedule = '{"type":"immediate"}'::jsonb,
        consideration_type = 'executive_compensation',
        status = 'approved',
        notes = 'Canonical CFO grant (6% of 70M)',
        approved_at = COALESCE(approved_at, NOW())
      WHERE id = v_keep_grant;

      UPDATE public.equity_grants
      SET status = 'revoked',
          notes = COALESCE(notes, '') || ' [revoked by canonical cap table dedupe]',
          approved_at = COALESCE(approved_at, NOW())
      WHERE executive_id = v_justin_exec_id
        AND id <> v_keep_grant
        AND COALESCE(status, '') <> 'revoked';
    END IF;
  END IF;

  IF v_jason_exec_id IS NOT NULL THEN
    SELECT id INTO v_keep_grant
    FROM public.equity_grants
    WHERE executive_id = v_jason_exec_id
    ORDER BY approved_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    IF v_keep_grant IS NULL THEN
      INSERT INTO public.equity_grants (
        executive_id, grant_date, shares_total, shares_percentage, share_class, strike_price,
        vesting_schedule, consideration_type, status, notes
      )
      VALUES (
        v_jason_exec_id, CURRENT_DATE, 2100000, 3.00, 'Common', 0.001,
        '{"type":"immediate"}'::jsonb, 'executive_compensation', 'approved',
        'Canonical CPO grant (3% of 70M)'
      );
    ELSE
      UPDATE public.equity_grants
      SET
        shares_total = 2100000,
        shares_percentage = 3.00,
        share_class = 'Common',
        strike_price = 0.001,
        vesting_schedule = '{"type":"immediate"}'::jsonb,
        consideration_type = 'executive_compensation',
        status = 'approved',
        notes = 'Canonical CPO grant (3% of 70M)',
        approved_at = COALESCE(approved_at, NOW())
      WHERE id = v_keep_grant;

      UPDATE public.equity_grants
      SET status = 'revoked',
          notes = COALESCE(notes, '') || ' [revoked by canonical cap table dedupe]',
          approved_at = COALESCE(approved_at, NOW())
      WHERE executive_id = v_jason_exec_id
        AND id <> v_keep_grant
        AND COALESCE(status, '') <> 'revoked';
    END IF;
  END IF;

  v_issued := v_holding_shares + v_founder_shares + v_justin_shares + v_jason_shares;
  v_unissued := v_authorized - v_issued;
  v_reserved_pool := GREATEST(v_unissued - v_micro_pool, 0);

  UPDATE public.cap_tables
  SET
    total_authorized = v_authorized,
    par_value = 0.001,
    holding_company_shares = v_holding_shares,
    holding_company_percentage = ROUND((v_holding_shares::NUMERIC / v_authorized::NUMERIC) * 100, 2),
    founder_shares = v_founder_shares,
    founder_percentage = ROUND((v_founder_shares::NUMERIC / v_authorized::NUMERIC) * 100, 2),
    total_issued = v_issued,
    total_unissued = v_unissued,
    micro_equity_pool = v_micro_pool,
    equity_pool = v_reserved_pool,
    pool_percentage = ROUND((v_reserved_pool::NUMERIC / v_authorized::NUMERIC) * 100, 2),
    as_of_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = v_cap_table_id;

  IF v_issued > v_authorized THEN
    RAISE EXCEPTION 'Cap table invalid: total_issued % exceeds total_authorized %', v_issued, v_authorized;
  END IF;

  IF (v_reserved_pool + v_micro_pool) <> v_unissued THEN
    RAISE EXCEPTION 'Cap table invalid: reserved_pool + micro_pool must equal total_unissued';
  END IF;

  INSERT INTO public.governance_log (
    action_type,
    action_category,
    target_type,
    target_id,
    target_name,
    description,
    metadata,
    performed_at
  ) VALUES (
    'cap_table_canonicalized',
    'equity',
    'cap_table',
    v_cap_table_id,
    'Canonical 70M cap table',
    'Applied canonical cap table and deduplicated equity grants/ledger for Torrance, Justin, and Jason.',
    jsonb_build_object(
      'authorized', v_authorized,
      'holding_company_shares', v_holding_shares,
      'founder_shares', v_founder_shares,
      'justin_shares', v_justin_shares,
      'jason_shares', v_jason_shares,
      'total_issued', v_issued,
      'total_unissued', v_unissued,
      'micro_equity_pool', v_micro_pool,
      'reserved_equity_pool', v_reserved_pool
    ),
    NOW()
  );
END $$;

