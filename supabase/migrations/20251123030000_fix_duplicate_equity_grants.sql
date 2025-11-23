-- Fix duplicate equity grants for Torrance Stroman
-- Merge duplicate grants into a single 20M share grant

DO $$
DECLARE
  torrance_user_id UUID;
  duplicate_ledger_ids UUID[];
  duplicate_vesting_ids UUID[];
  first_ledger_id UUID;
  first_vesting_id UUID;
  total_shares BIGINT := 20000000;
BEGIN
  -- Find Torrance's user ID
  SELECT id INTO torrance_user_id
  FROM auth.users
  WHERE email = 'tstroman.ceo@cravenusa.com'
  LIMIT 1;

  IF torrance_user_id IS NULL THEN
    RAISE NOTICE 'Torrance user not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found Torrance user: %', torrance_user_id;

  -- Find all equity ledger entries for Torrance with grant type
  SELECT ARRAY_AGG(id ORDER BY created_at)
  INTO duplicate_ledger_ids
  FROM equity_ledger
  WHERE recipient_user_id = torrance_user_id
    AND transaction_type = 'grant';

  -- Find all vesting schedules for Torrance
  SELECT ARRAY_AGG(id ORDER BY created_at)
  INTO duplicate_vesting_ids
  FROM vesting_schedules
  WHERE recipient_user_id = torrance_user_id;

  IF duplicate_ledger_ids IS NULL OR array_length(duplicate_ledger_ids, 1) IS NULL THEN
    RAISE NOTICE 'No equity grants found for Torrance';
    RETURN;
  END IF;

  RAISE NOTICE 'Found % equity ledger entries', array_length(duplicate_ledger_ids, 1);
  RAISE NOTICE 'Found % vesting schedules', COALESCE(array_length(duplicate_vesting_ids, 1), 0);

  -- Keep the first (oldest) entry, delete the rest
  first_ledger_id := duplicate_ledger_ids[1];
  
  IF array_length(duplicate_ledger_ids, 1) > 1 THEN
    -- Update the first entry to have the correct total (20M)
    UPDATE equity_ledger
    SET shares_amount = total_shares,
        notes = 'Equity grant: 20000000 shares, immediate vesting (merged duplicates)',
        updated_at = now()
    WHERE id = first_ledger_id;

    -- Delete duplicate ledger entries
    DELETE FROM equity_ledger
    WHERE recipient_user_id = torrance_user_id
      AND transaction_type = 'grant'
      AND id != first_ledger_id;

    RAISE NOTICE 'Deleted % duplicate equity ledger entries', array_length(duplicate_ledger_ids, 1) - 1;
  END IF;

  -- Handle vesting schedules
  IF duplicate_vesting_ids IS NOT NULL AND array_length(duplicate_vesting_ids, 1) > 1 THEN
    first_vesting_id := duplicate_vesting_ids[1];
    
    -- Update the first vesting schedule to have correct totals
    UPDATE vesting_schedules
    SET total_shares = total_shares,
        vested_shares = total_shares,
        unvested_shares = 0,
        vesting_type = 'immediate',
        updated_at = now()
    WHERE id = first_vesting_id;

    -- Delete duplicate vesting schedules
    DELETE FROM vesting_schedules
    WHERE recipient_user_id = torrance_user_id
      AND id != first_vesting_id;

    RAISE NOTICE 'Deleted % duplicate vesting schedules', array_length(duplicate_vesting_ids, 1) - 1;
  END IF;

  -- Fix cap table - should have 20M issued, not 40M
  UPDATE cap_tables
  SET total_issued = (
    SELECT COALESCE(SUM(shares_amount), 0)
    FROM equity_ledger
    WHERE transaction_type = 'grant'
  ),
  total_unissued = total_authorized - (
    SELECT COALESCE(SUM(shares_amount), 0)
    FROM equity_ledger
    WHERE transaction_type = 'grant'
  ),
  updated_at = now()
  WHERE id IN (SELECT id FROM cap_tables LIMIT 1);

  RAISE NOTICE 'Fixed cap table totals';
  RAISE NOTICE 'Completed: Merged duplicate grants into single 20M share grant';

END $$;

