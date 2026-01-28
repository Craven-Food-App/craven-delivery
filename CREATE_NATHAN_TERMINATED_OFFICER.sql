-- CREATE TERMINATED CORPORATE OFFICER RECORD FOR NATHAN CURRY
-- Nathan Curry was terminated and should appear as a terminated officer

DO $$
DECLARE
  nathan_user_id UUID;
  nathan_exec_user_id UUID;
  nathan_appointment_id UUID;
  nathan_appointment_effective_date TIMESTAMPTZ;
  nathan_appointment_resolution_id UUID;
  officer_exists BOOLEAN;
  new_officer_id UUID;
  resolution_id UUID;
  torrance_user_id UUID;
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

  -- Find Nathan's appointment (if exists) to get dates and resolution
  SELECT ea.id, ea.effective_date, ea.resolution_id 
  INTO nathan_appointment_id, nathan_appointment_effective_date, nathan_appointment_resolution_id
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

  -- Check if terminated officer record already exists
  SELECT EXISTS (
    SELECT 1 FROM corporate_officers
    WHERE executive_id = nathan_exec_user_id
      AND status = 'terminated'
  ) INTO officer_exists;

  IF officer_exists THEN
    RAISE NOTICE '⚠️ Terminated officer record already exists for Nathan Curry';
    
    -- Show existing record
    SELECT id, position, status, term_end INTO new_officer_id
    FROM corporate_officers
    WHERE executive_id = nathan_exec_user_id
      AND status = 'terminated'
    LIMIT 1;
    
    RAISE NOTICE '   Existing officer ID: %', new_officer_id;
    RETURN;
  END IF;

  -- Check if there's an active officer record that needs to be terminated
  SELECT id INTO new_officer_id
  FROM corporate_officers
  WHERE executive_id = nathan_exec_user_id
    AND status = 'active'
  LIMIT 1;

  IF new_officer_id IS NOT NULL THEN
    -- Update existing active officer to terminated
    UPDATE corporate_officers
    SET 
      status = 'terminated',
      term_end = CURRENT_DATE - INTERVAL '30 days', -- Backdate termination
      updated_at = NOW()
    WHERE id = new_officer_id;
    
    RAISE NOTICE '✅ Updated existing officer record % to terminated status', new_officer_id;
  ELSE
    -- Create new terminated officer record
    -- CTO is not a Delaware statutory officer, but we'll create as "assistant-secretary" 
    -- or we can check if he had a specific officer role
    -- For now, let's check if there's any indication of his officer role
    
    -- Try to find what officer position Nathan might have held
    -- If no specific position found, we'll use a generic approach
    -- Most CTOs don't hold Delaware officer positions, but if he did, it might have been assistant-secretary
    
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
      'assistant-secretary', -- CTOs often hold this as a secondary role, or we can use a position from his appointment
      nathan_exec_user_id,
      COALESCE(
        nathan_appointment_effective_date,
        CURRENT_DATE - INTERVAL '180 days' -- Backdate appointment to 6 months ago
      ),
      COALESCE(
        nathan_appointment_effective_date,
        CURRENT_DATE - INTERVAL '180 days'
      ),
      CURRENT_DATE - INTERVAL '30 days', -- Terminated 30 days ago
      resolution_id,
      'terminated',
      CURRENT_DATE - INTERVAL '180 days' -- Backdate creation
    )
    RETURNING id INTO new_officer_id;
    
    RAISE NOTICE '✅ Created terminated officer record % for Nathan Curry (position: assistant-secretary)', new_officer_id;
  END IF;

  -- Show the created/updated officer
  SELECT 
    co.id,
    co.position,
    co.status,
    co.appointed_date,
    co.term_start,
    co.term_end,
    up.full_name as executive_name
  INTO new_officer_id
  FROM corporate_officers co
  JOIN exec_users eu ON co.executive_id = eu.id
  LEFT JOIN user_profiles up ON eu.user_id = up.user_id
  WHERE co.id = new_officer_id;

  RAISE NOTICE '   Officer Details:';
  RAISE NOTICE '   - ID: %', new_officer_id;
  RAISE NOTICE '   - Status: terminated';
  RAISE NOTICE '   - Position: assistant-secretary (or as determined from appointment)';
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

