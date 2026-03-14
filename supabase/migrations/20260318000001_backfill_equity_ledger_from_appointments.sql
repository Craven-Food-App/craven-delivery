-- Backfill equity_ledger from executive_appointments that have equity_included and share_count.
-- Cap table reads from equity_ledger; appointments only had equity in executive_appointments.
-- This migration creates the missing grant rows so officers' shares show on the cap table.

DO $$
DECLARE
  r RECORD;
  v_resolution_id UUID;
  v_share_count BIGINT;
  v_price NUMERIC(10,6);
  v_effective_date DATE;
  v_user_id UUID;
  v_already_exists BOOLEAN;
  v_inserted INT := 0;
BEGIN
  FOR r IN
    SELECT
      ea.id AS appointment_id,
      ea.proposed_officer_name,
      ea.proposed_officer_email,
      ea.effective_date AS apt_effective_date,
      ea.resolution_id AS res_id,
      ea.equity_details
    FROM public.executive_appointments ea
    WHERE ea.equity_included = true
      AND ea.proposed_officer_email IS NOT NULL
      AND TRIM(ea.proposed_officer_email) <> ''
      AND ea.resolution_id IS NOT NULL
  LOOP
    v_resolution_id := r.res_id;
    v_effective_date := r.apt_effective_date;
    IF v_effective_date IS NULL THEN
      v_effective_date := CURRENT_DATE;
    END IF;

    -- Parse equity_details (may be jsonb or text stored as json)
    BEGIN
      v_share_count := (r.equity_details::jsonb->>'share_count')::bigint;
    EXCEPTION WHEN OTHERS THEN
      v_share_count := 0;
    END;
    IF v_share_count IS NULL OR v_share_count <= 0 THEN
      CONTINUE;
    END IF;

    BEGIN
      v_price := (regexp_replace(r.equity_details::jsonb->>'exercise_price', '[^0-9.]', '', 'g'))::numeric;
    EXCEPTION WHEN OTHERS THEN
      v_price := 0.001;
    END;
    IF v_price IS NULL OR v_price <= 0 THEN
      v_price := 0.001;
    END IF;

    -- Resolve user by email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(r.proposed_officer_email))
    LIMIT 1;

    IF v_user_id IS NULL THEN
      RAISE NOTICE 'Backfill equity: no auth user for email %, skipping appointment %', r.proposed_officer_email, r.appointment_id;
      CONTINUE;
    END IF;

    -- Skip if grant already exists for this recipient + resolution
    SELECT EXISTS(
      SELECT 1 FROM public.equity_ledger el
      WHERE el.transaction_type = 'grant'
        AND el.recipient_user_id = v_user_id
        AND el.resolution_id IS NOT DISTINCT FROM v_resolution_id
    ) INTO v_already_exists;

    IF v_already_exists THEN
      CONTINUE;
    END IF;

    INSERT INTO public.equity_ledger (
      transaction_type,
      recipient_user_id,
      shares_amount,
      share_class,
      price_per_share,
      transaction_date,
      effective_date,
      resolution_id,
      notes
    ) VALUES (
      'grant',
      v_user_id,
      v_share_count,
      'Common',
      v_price,
      v_effective_date,
      v_effective_date,
      v_resolution_id,
      'Backfill: executive appointment grant for ' || COALESCE(r.proposed_officer_name, r.proposed_officer_email)
    );
    v_inserted := v_inserted + 1;
    RAISE NOTICE 'Backfill equity: created grant for % (%) - % shares', r.proposed_officer_name, r.proposed_officer_email, v_share_count;
  END LOOP;

  RAISE NOTICE 'Backfill equity_ledger from appointments: inserted % grant(s)', v_inserted;
END $$;
