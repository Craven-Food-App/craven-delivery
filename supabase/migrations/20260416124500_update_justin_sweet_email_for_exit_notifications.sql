-- Update Justin Sweet's contact email so exit workflow notifications
-- are sent to the requested destination.
-- NOTE: This intentionally updates business/contact tables only
-- (not auth.users login email) to avoid sign-in/access side effects.

DO $$
DECLARE
  v_new_email text := 'wisdomlovepassion@gmail.com';
  v_user_id uuid := '5a259c29-8cdd-4569-9a3c-4f7481f1b441';
  v_updated integer;
BEGIN
  -- employees (used by exit workflow selection + notifications)
  UPDATE public.employees
  SET email = v_new_email,
      updated_at = now()
  WHERE user_id = v_user_id
     OR (lower(first_name) = 'justin' AND lower(last_name) = 'sweet')
     OR lower(email) IN ('jsweet.cfo@cravenusa.com', 'wowbilallovely@gmail.com');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Updated employees rows: %', v_updated;

  -- user_profiles (common profile lookup source)
  UPDATE public.user_profiles
  SET email = v_new_email,
      updated_at = now()
  WHERE user_id = v_user_id
     OR lower(full_name) = 'justin sweet'
     OR lower(email) IN ('jsweet.cfo@cravenusa.com', 'wowbilallovely@gmail.com');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Updated user_profiles rows: %', v_updated;

  -- exec_users email (if present/used by governance lookups)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'exec_users'
      AND column_name = 'email'
  ) THEN
    UPDATE public.exec_users
    SET email = v_new_email
    WHERE user_id = v_user_id
       OR lower(name) = 'justin sweet'
       OR lower(email) IN ('jsweet.cfo@cravenusa.com', 'wowbilallovely@gmail.com');
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE 'Updated exec_users rows: %', v_updated;
  END IF;

  -- ceo_access_credentials email key used for hub PIN lookup
  UPDATE public.ceo_access_credentials
  SET user_email = v_new_email,
      updated_at = now()
  WHERE lower(user_email) IN ('jsweet.cfo@cravenusa.com', 'wowbilallovely@gmail.com');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Updated ceo_access_credentials rows: %', v_updated;

  -- executive appointment contact records for document/email workflows
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'executive_appointments'
      AND column_name = 'proposed_officer_email'
  ) THEN
    UPDATE public.executive_appointments
    SET proposed_officer_email = v_new_email
    WHERE lower(officer_name) = 'justin sweet'
       OR lower(proposed_officer_email) IN ('jsweet.cfo@cravenusa.com', 'wowbilallovely@gmail.com');
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE 'Updated executive_appointments rows: %', v_updated;
  END IF;
END $$;

