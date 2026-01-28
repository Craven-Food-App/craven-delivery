-- CREATE TERMINATED CORPORATE OFFICER RECORD FOR NATHAN CURRY
-- Nathan Curry was terminated and should appear as a terminated officer
-- This script merges any existing active/terminated records into a single terminated record
-- Position: Chief Technology Officer (CTO)
-- Appointed: 11/19/2025
-- Terminated: 1/1/2026

DO $$
DECLARE
  nathan_user_id UUID;
  nathan_exec_user_id UUID;
  nathan_appointment_id UUID;
  nathan_appointment_resolution_id UUID;
  resolution_id UUID;
  new_officer_id UUID;
  deleted_count INTEGER;
BEGIN
  -- Find Nathan Curry's user ID
  SELECT id INTO nathan_user_id
  FROM auth.users
  WHERE email = 'natecurry.cto@cravenusa.com'
  LIMIT 1;

  IF nathan_user_id IS NULL THEN
    RAISE NOTICE '❌ Nathan Curry user not found';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found Nathan Curry user_id: %', nathan_user_id;

  -- Find Nathan's exec_user record
  SELECT id INTO nathan_exec_user_id
  FROM exec_users
  WHERE user_id = nathan_user_id
  LIMIT 1;

  IF nathan_exec_user_id IS NULL THEN
    RAISE NOTICE '❌ Nathan Curry exec_user not found';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found Nathan Curry exec_user_id: %', nathan_exec_user_id;

  -- Find Nathan's appointment (if exists) to get resolution
  SELECT ea.id, ea.resolution_id 
  INTO nathan_appointment_id, nathan_appointment_resolution_id
  FROM executive_appointments ea
  WHERE ea.executive_id = nathan_exec_user_id
  ORDER BY ea.effective_date DESC
  LIMIT 1;

  -- Use resolution from appointment if found
  resolution_id := nathan_appointment_resolution_id;

  -- If no resolution from appointment, find resolution related to Nathan's termination
  IF resolution_id IS NULL THEN
    SELECT id INTO resolution_id
    FROM governance_board_resolutions
    WHERE title ILIKE '%nathan%curry%'
       OR title ILIKE '%nathan%removal%'
       OR title ILIKE '%nathan%termination%'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Delete ALL existing officer records for Nathan (both active and terminated)
  -- We'll create a single correct record
  DELETE FROM corporate_officers
  WHERE executive_id = nathan_exec_user_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE '✅ Deleted % existing officer record(s) for Nathan Curry', deleted_count;
  ELSE
    RAISE NOTICE 'ℹ️ No existing officer records found for Nathan Curry';
  END IF;

  -- Create the single correct terminated officer record
  INSERT INTO corporate_officers (
    position,
    executive_id,
    appointed_date,
    term_start,
    term_end,
    resolution_id,
    status,
    created_at
  ) VALUES (
    'cto', -- Chief Technology Officer
    nathan_exec_user_id,
    '2025-11-19'::DATE, -- Appointed on 11/19/2025
    '2025-11-19'::DATE, -- Term started on 11/19/2025
    '2026-01-01'::DATE, -- Terminated on 1/1/2026
    resolution_id,
    'terminated',
    '2025-11-19'::TIMESTAMPTZ
  )
  RETURNING id INTO new_officer_id;
  
  RAISE NOTICE '✅ Created terminated officer record % for Nathan Curry', new_officer_id;
  RAISE NOTICE '   - Position: CTO (Chief Technology Officer)';
  RAISE NOTICE '   - Appointed: 2025-11-19';
  RAISE NOTICE '   - Terminated: 2026-01-01';
  RAISE NOTICE '   - Status: terminated';
END $$;

-- Verify the terminated officer was created
SELECT 
  'VERIFICATION - NATHAN CURRY TERMINATED OFFICER' as info,
  co.id,
  co.position,
  co.status,
  co.appointed_date,
  co.term_start,
  co.term_end,
  up.full_name as executive_name,
  up.email as executive_email,
  eu.title as executive_title,
  gbr.resolution_number
FROM corporate_officers co
JOIN exec_users eu ON co.executive_id = eu.id
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
LEFT JOIN governance_board_resolutions gbr ON co.resolution_id = gbr.id
WHERE (up.email = 'natecurry.cto@cravenusa.com' OR up.email ILIKE '%nathan%curry%')
   AND co.status = 'terminated'
ORDER BY co.term_end DESC
LIMIT 5;

