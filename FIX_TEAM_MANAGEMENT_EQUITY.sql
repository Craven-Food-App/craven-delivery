-- FIX TEAM MANAGEMENT EQUITY ISSUES
-- 1. Delete duplicate "Chief Executive Officer" entry in exec_users (without a real user)
-- 2. Update Torrance Stroman's equity to 10,500,000 shares in equity_ledger

DO $$
DECLARE
  torrance_user_id UUID;
  torrance_exec_user_id UUID;
  duplicate_ceo_id UUID;
  orphaned_user_id UUID;
  torrance_equity_id UUID;
  updated_count INTEGER;
BEGIN
  -- Find Torrance Stroman's user_id
  SELECT id INTO torrance_user_id
  FROM auth.users
  WHERE email = 'tstroman.ceo@cravenusa.com'
  LIMIT 1;

  IF torrance_user_id IS NULL THEN
    RAISE NOTICE 'Torrance Stroman user not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found Torrance Stroman user_id: %', torrance_user_id;

  -- Find Torrance's exec_user record
  SELECT id INTO torrance_exec_user_id
  FROM exec_users
  WHERE user_id = torrance_user_id
  LIMIT 1;

  IF torrance_exec_user_id IS NULL THEN
    RAISE NOTICE 'Torrance Stroman exec_user not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found Torrance Stroman exec_user_id: %', torrance_exec_user_id;

  -- Find and delete ALL duplicate "Chief Executive Officer" entries in exec_users
  -- These are entries with CEO-related titles but NOT Torrance's user_id
  -- Also delete entries where user_id doesn't exist in auth.users or user_profiles
  FOR duplicate_ceo_id IN
    SELECT eu.id
    FROM exec_users eu
    LEFT JOIN user_profiles up ON eu.user_id = up.user_id
    LEFT JOIN auth.users au ON eu.user_id = au.id
    WHERE (eu.title ILIKE '%Chief Executive Officer%' OR eu.title ILIKE '%CEO%')
      AND eu.user_id != torrance_user_id
      AND (
        -- No user_profile exists
        up.user_id IS NULL
        -- Or user_profile exists but has no name or name equals title (orphaned)
        OR up.full_name IS NULL 
        OR up.full_name = ''
        OR up.full_name = eu.title
        OR up.full_name ILIKE '%CEO%'
        -- Or user doesn't exist in auth.users
        OR au.id IS NULL
      )
  LOOP
    RAISE NOTICE 'Found duplicate/orphaned CEO exec_user entry: %', duplicate_ceo_id;
    
    -- Get the user_id before deleting to clean up equity_ledger
    SELECT user_id INTO orphaned_user_id
    FROM exec_users
    WHERE id = duplicate_ceo_id;
    
    -- Delete equity_ledger entries for this orphaned user
    IF orphaned_user_id IS NOT NULL THEN
      DELETE FROM equity_ledger
      WHERE recipient_user_id = orphaned_user_id;
      
      GET DIAGNOSTICS updated_count = ROW_COUNT;
      IF updated_count > 0 THEN
        RAISE NOTICE 'Deleted % equity_ledger entries for orphaned user_id: %', updated_count, orphaned_user_id;
      END IF;
    END IF;
    
    -- Delete the duplicate exec_user entry
    DELETE FROM exec_users
    WHERE id = duplicate_ceo_id;
    
    RAISE NOTICE 'Deleted duplicate CEO exec_user entry: %', duplicate_ceo_id;
  END LOOP;

  -- Update Torrance's equity in equity_ledger to 10,500,000 shares
  -- First, find his current equity ledger entry
  SELECT id INTO torrance_equity_id
  FROM equity_ledger
  WHERE recipient_user_id = torrance_user_id
    AND transaction_type = 'grant'
  ORDER BY transaction_date DESC
  LIMIT 1;

  IF torrance_equity_id IS NOT NULL THEN
    -- Update existing entry
    UPDATE equity_ledger
    SET 
      shares_amount = 10500000,
      updated_at = NOW()
    WHERE id = torrance_equity_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    IF updated_count > 0 THEN
      RAISE NOTICE 'Updated Torrance equity ledger entry % to 10,500,000 shares', torrance_equity_id;
    END IF;
  ELSE
    -- Create new entry if it doesn't exist
    INSERT INTO equity_ledger (
      transaction_type,
      recipient_user_id,
      shares_amount,
      share_class,
      price_per_share,
      transaction_date,
      effective_date,
      notes,
      created_at,
      updated_at
    ) VALUES (
      'grant',
      torrance_user_id,
      10500000,
      'Common',
      0.0001,
      CURRENT_DATE,
      CURRENT_DATE,
      'Founder equity: 10,500,000 shares',
      NOW(),
      NOW()
    )
    RETURNING id INTO torrance_equity_id;
    
    RAISE NOTICE 'Created new equity ledger entry for Torrance: 10,500,000 shares (ID: %)', torrance_equity_id;
  END IF;

  -- Also check for any other equity_ledger entries for Torrance with wrong amounts
  UPDATE equity_ledger
  SET 
    shares_amount = 10500000,
    updated_at = NOW()
  WHERE recipient_user_id = torrance_user_id
    AND transaction_type = 'grant'
    AND shares_amount != 10500000;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'Updated % additional equity ledger entries for Torrance', updated_count;
  END IF;

END $$;

-- Verify the fixes
SELECT 
  'VERIFICATION - EXEC_USERS' as info,
  eu.id,
  eu.title,
  up.full_name,
  up.email,
  eu.user_id
FROM exec_users eu
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
WHERE eu.title ILIKE '%CEO%' OR eu.title ILIKE '%Chief Executive%'
ORDER BY up.full_name NULLS LAST;

-- Verify Torrance's equity
SELECT 
  'VERIFICATION - TORRANCE EQUITY' as info,
  el.id,
  el.shares_amount,
  el.transaction_type,
  el.transaction_date,
  up.full_name,
  up.email
FROM equity_ledger el
JOIN auth.users au ON el.recipient_user_id = au.id
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.email = 'tstroman.ceo@cravenusa.com'
  AND el.transaction_type = 'grant'
ORDER BY el.transaction_date DESC;

