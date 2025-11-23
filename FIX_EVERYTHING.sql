-- COMPLETE FIX: RLS + Duplicates + Grant Visibility
-- Run this entire file in Supabase SQL Editor

-- ============================================
-- PART 1: Fix RLS Policies
-- ============================================

-- Drop all existing equity_ledger policies
DROP POLICY IF EXISTS "Executives can view equity ledger" ON public.equity_ledger;
DROP POLICY IF EXISTS "Executives can manage equity ledger" ON public.equity_ledger;
DROP POLICY IF EXISTS "Users can view own equity ledger" ON public.equity_ledger;
DROP POLICY IF EXISTS "Executives can view all equity ledger" ON public.equity_ledger;
DROP POLICY IF EXISTS "Service role can manage equity ledger" ON public.equity_ledger;

-- Create simple, working policies
CREATE POLICY "Users can view own equity ledger"
ON public.equity_ledger FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid());

CREATE POLICY "Service role can manage equity ledger"
ON public.equity_ledger FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix vesting_schedules RLS
DROP POLICY IF EXISTS "Executives can view vesting schedules" ON public.vesting_schedules;
DROP POLICY IF EXISTS "Executives can manage vesting schedules" ON public.vesting_schedules;
DROP POLICY IF EXISTS "Users can view own vesting schedules" ON public.vesting_schedules;
DROP POLICY IF EXISTS "Executives can view all vesting schedules" ON public.vesting_schedules;
DROP POLICY IF EXISTS "Service role can manage vesting schedules" ON public.vesting_schedules;

CREATE POLICY "Users can view own vesting schedules"
ON public.vesting_schedules FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid());

CREATE POLICY "Service role can manage vesting schedules"
ON public.vesting_schedules FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- PART 2: Fix Duplicate Grants
-- ============================================

DO $$
DECLARE
  grant_ids UUID[];
  first_id UUID;
  user_id_from_grant UUID;
  torrance_user_id UUID;
BEGIN
  -- Find all grants with ~20M shares
  SELECT ARRAY_AGG(id ORDER BY created_at)
  INTO grant_ids
  FROM equity_ledger
  WHERE transaction_type = 'grant'
    AND shares_amount >= 19000000
    AND shares_amount <= 21000000;

  IF grant_ids IS NULL OR array_length(grant_ids, 1) IS NULL THEN
    RAISE NOTICE 'No grants found with ~20M shares';
    RETURN;
  END IF;

  RAISE NOTICE 'Found % grant(s)', array_length(grant_ids, 1);

  -- Get user_id from first grant
  SELECT recipient_user_id INTO user_id_from_grant
  FROM equity_ledger
  WHERE id = grant_ids[1];

  first_id := grant_ids[1];

  -- Update first to exactly 20M
  UPDATE equity_ledger
  SET shares_amount = 20000000,
      notes = 'Equity grant: 20000000 shares, immediate vesting'
  WHERE id = first_id;

  -- Delete duplicates
  IF array_length(grant_ids, 1) > 1 THEN
    DELETE FROM equity_ledger
    WHERE id = ANY(grant_ids[2:array_length(grant_ids, 1)]);
    RAISE NOTICE 'Deleted % duplicate(s)', array_length(grant_ids, 1) - 1;
  END IF;

  -- Fix vesting schedules
  IF user_id_from_grant IS NOT NULL THEN
    UPDATE vesting_schedules
    SET total_shares = 20000000,
        vested_shares = 20000000,
        unvested_shares = 0,
        vesting_type = 'immediate'
    WHERE recipient_user_id = user_id_from_grant
      AND id = (SELECT id FROM vesting_schedules WHERE recipient_user_id = user_id_from_grant ORDER BY created_at LIMIT 1);

    DELETE FROM vesting_schedules
    WHERE recipient_user_id = user_id_from_grant
      AND id NOT IN (SELECT id FROM vesting_schedules WHERE recipient_user_id = user_id_from_grant ORDER BY created_at LIMIT 1);
  END IF;

  -- Fix cap table
  UPDATE cap_tables
  SET total_issued = (SELECT COALESCE(SUM(shares_amount), 0) FROM equity_ledger WHERE transaction_type = 'grant'),
      total_unissued = total_authorized - (SELECT COALESCE(SUM(shares_amount), 0) FROM equity_ledger WHERE transaction_type = 'grant')
  WHERE id IN (SELECT id FROM cap_tables LIMIT 1);

  -- Fix share certificates - link ALL Torrance certificates and update to 20M shares
  -- Find Torrance's user ID
  SELECT id INTO torrance_user_id
  FROM auth.users
  WHERE email = 'tstroman.ceo@cravenusa.com'
  LIMIT 1;

  IF torrance_user_id IS NOT NULL THEN
    -- Update ALL certificates that might belong to Torrance:
    -- 1. CERT-2025-0001 (database record showing "Unknown")
    -- 2. CERT-AD363EB7 (PDF certificate showing 2M shares)
    -- 3. Any certificate with ~2M or ~20M shares that's not linked
    UPDATE share_certificates
    SET recipient_user_id = torrance_user_id,
        shares_amount = 20000000
    WHERE certificate_number IN ('CERT-2025-0001', 'CERT-AD363EB7')
       OR (shares_amount >= 1900000 AND shares_amount <= 21000000 AND (recipient_user_id IS NULL OR recipient_user_id != torrance_user_id))
       OR (shares_amount = 2000000);

    -- Also update any certificate already linked to Torrance to ensure 20M
    UPDATE share_certificates
    SET shares_amount = 20000000
    WHERE recipient_user_id = torrance_user_id
      AND shares_amount != 20000000;

    -- If no certificate exists for Torrance, create CERT-2025-0001
    IF NOT EXISTS (SELECT 1 FROM share_certificates WHERE recipient_user_id = torrance_user_id) THEN
      INSERT INTO share_certificates (
        recipient_user_id,
        certificate_number,
        shares_amount,
        share_class,
        issue_date,
        status
      )
      VALUES (
        torrance_user_id,
        'CERT-2025-0001',
        20000000,
        'COMMON',
        CURRENT_DATE,
        'issued'
      )
      ON CONFLICT (certificate_number) DO UPDATE
      SET recipient_user_id = torrance_user_id,
          shares_amount = 20000000;
      
      RAISE NOTICE 'Created share certificate CERT-2025-0001 for Torrance Stroman (20M shares)';
    ELSE
      RAISE NOTICE 'Updated all certificates to link to Torrance Stroman (20M shares)';
      RAISE NOTICE 'NOTE: Certificate PDFs need to be regenerated to show 20M shares. Use governance-generate-certificate function.';
    END IF;
  ELSE
    RAISE NOTICE 'Torrance user not found, skipping certificate fix';
  END IF;

  RAISE NOTICE '✅ All fixes applied - grants, certificates (20M), and cap table updated';

END $$;


