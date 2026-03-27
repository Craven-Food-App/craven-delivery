-- Torrance Stroman: single canonical officer title (Founder CEO) and board roles;
-- Markayla Danzy: remove exec record and equity (not an executive).

DO $$
DECLARE
  v_torrance_uid UUID;
  v_markayla_uid UUID;
BEGIN
  SELECT id INTO v_torrance_uid
  FROM auth.users
  WHERE email = 'tstroman.ceo@cravenusa.com'
  LIMIT 1;

  IF v_torrance_uid IS NOT NULL THEN
    -- Only columns guaranteed on all DBs; display name lives on user_profiles.
    UPDATE public.exec_users
    SET title = 'Founder CEO'
    WHERE user_id = v_torrance_uid;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'exec_users'
        AND column_name = 'name'
    ) THEN
      UPDATE public.exec_users
      SET name = COALESCE(NULLIF(trim(name), ''), 'Torrance Stroman')
      WHERE user_id = v_torrance_uid;
    END IF;
  END IF;

  UPDATE public.board_members
  SET
    role_title = 'Board Chair · Director · Secretary',
    full_name = COALESCE(NULLIF(trim(full_name), ''), 'Torrance Stroman')
  WHERE LOWER(email) = 'tstroman.ceo@cravenusa.com'
     OR (v_torrance_uid IS NOT NULL AND user_id = v_torrance_uid);

  SELECT user_id INTO v_markayla_uid
  FROM public.user_profiles
  WHERE full_name ILIKE '%Markayla%Danzy%'
     OR full_name ILIKE '%Danzy%Markayla%'
  LIMIT 1;

  IF v_markayla_uid IS NOT NULL THEN
    UPDATE public.equity_grants eg
    SET
      status = 'revoked',
      notes = COALESCE(eg.notes, '') || ' [revoked: not an executive — no equity per governance fix 2026-03-27]'
    FROM public.exec_users eu
    WHERE eg.executive_id = eu.id
      AND eu.user_id = v_markayla_uid
      AND COALESCE(eg.status, '') <> 'revoked';

    UPDATE public.equity_grants eg
    SET
      status = 'revoked',
      notes = COALESCE(eg.notes, '') || ' [revoked: not an executive — no equity per governance fix 2026-03-27]'
    FROM public.employees em
    WHERE eg.employee_id = em.id
      AND em.user_id = v_markayla_uid
      AND COALESCE(eg.status, '') <> 'revoked';

    DELETE FROM public.equity_ledger
    WHERE recipient_user_id = v_markayla_uid;

    DELETE FROM public.vesting_schedules
    WHERE recipient_user_id = v_markayla_uid;

    DELETE FROM public.exec_users
    WHERE user_id = v_markayla_uid;
  END IF;
END $$;
