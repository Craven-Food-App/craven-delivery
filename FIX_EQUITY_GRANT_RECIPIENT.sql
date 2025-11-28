-- Fix equity_ledger recipient_user_id to link to Torrance Stroman
-- This ensures the Equity Grants UI shows the correct recipient name and email

DO $$
DECLARE
  torrance_user_id UUID;
  torrance_email TEXT := 'tstroman.ceo@cravenusa.com';
  torrance_full_name TEXT := 'Torrance Stroman';
  records_updated INTEGER;
  records_count INTEGER;
BEGIN
  -- Find Torrance's user_id
  SELECT id INTO torrance_user_id
  FROM auth.users
  WHERE email = torrance_email
  LIMIT 1;

  IF torrance_user_id IS NULL THEN
    RAISE EXCEPTION 'Could not find user with email: %', torrance_email;
  END IF;

  RAISE NOTICE 'Found Torrance user_id: %', torrance_user_id;

  -- Update ALL equity_ledger records with 18,000,000 shares to link to Torrance
  -- (in case there are multiple or the recipient_user_id is wrong/null)
  UPDATE public.equity_ledger
  SET
    recipient_user_id = torrance_user_id,
    updated_at = NOW()
  WHERE shares_amount = 18000000
    AND transaction_type = 'grant'
    AND (recipient_user_id IS NULL OR recipient_user_id != torrance_user_id);

  GET DIAGNOSTICS records_updated = ROW_COUNT;
  
  IF records_updated > 0 THEN
    RAISE NOTICE 'Updated % equity_ledger record(s) to link to Torrance user_id: %', records_updated, torrance_user_id;
  ELSE
    -- Check if record already exists with correct user_id
    SELECT COUNT(*) INTO records_count
    FROM public.equity_ledger
    WHERE shares_amount = 18000000
      AND transaction_type = 'grant'
      AND recipient_user_id = torrance_user_id;
      
    IF records_count > 0 THEN
      RAISE NOTICE 'Equity ledger already correctly linked to Torrance user_id: %', torrance_user_id;
    ELSE
      RAISE WARNING 'No equity_ledger record found with 18,000,000 shares - may need to create one';
    END IF;
  END IF;

  -- Ensure user_profiles has correct data
  INSERT INTO public.user_profiles (user_id, email, full_name, role)
  VALUES (torrance_user_id, torrance_email, torrance_full_name, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET
    email = torrance_email,
    full_name = torrance_full_name,
    updated_at = NOW();

  RAISE NOTICE 'Verified user_profiles for Torrance Stroman';
  
  -- Verify the fix
  SELECT 
    el.id,
    el.recipient_user_id,
    el.shares_amount,
    up.full_name,
    up.email
  FROM public.equity_ledger el
  LEFT JOIN public.user_profiles up ON el.recipient_user_id = up.user_id
  WHERE el.shares_amount = 18000000
    AND el.transaction_type = 'grant';
    
END $$;

