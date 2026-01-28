-- MIGRATE OLD APPOINTMENT DATA TO NEW SCHEMA
-- This migrates appointments from old schema (proposed_officer_name) to new schema (executive_id)

-- First, check if old schema columns exist
DO $$
DECLARE
  has_old_schema BOOLEAN;
  has_new_schema BOOLEAN;
BEGIN
  -- Check for old schema columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'executive_appointments'
      AND column_name = 'proposed_officer_name'
  ) INTO has_old_schema;
  
  -- Check for new schema columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'executive_appointments'
      AND column_name = 'executive_id'
  ) INTO has_new_schema;
  
  RAISE NOTICE 'Old schema exists: %, New schema exists: %', has_old_schema, has_new_schema;
  
  -- If old schema exists, migrate the data
  IF has_old_schema THEN
    RAISE NOTICE 'Migrating old appointment data to new schema...';
    
    -- Create new appointments from old ones
    INSERT INTO executive_appointments (
      executive_id,
      position,
      appointment_type,
      appointment_date,
      effective_date,
      appointed_by,
      resolution_id,
      status,
      notes,
      created_at
    )
    SELECT DISTINCT ON (ea.id)
      COALESCE(
        -- Try to find exec_user by email
        (SELECT id FROM exec_users eu 
         JOIN user_profiles up ON eu.user_id = up.user_id
         WHERE up.email = ea.proposed_officer_email LIMIT 1),
        -- Try to find exec_user by name
        (SELECT id FROM exec_users eu 
         JOIN user_profiles up ON eu.user_id = up.user_id
         WHERE LOWER(up.full_name) = LOWER(ea.proposed_officer_name) LIMIT 1),
        -- Try to find by role based on title
        (SELECT id FROM exec_users 
         WHERE role = CASE 
           WHEN ea.proposed_title ILIKE '%CEO%' OR ea.proposed_title ILIKE '%Chief Executive%' THEN 'ceo'
           WHEN ea.proposed_title ILIKE '%CFO%' OR ea.proposed_title ILIKE '%Chief Financial%' THEN 'cfo'
           WHEN ea.proposed_title ILIKE '%CTO%' OR ea.proposed_title ILIKE '%Chief Technology%' THEN 'cto'
           WHEN ea.proposed_title ILIKE '%COO%' OR ea.proposed_title ILIKE '%Chief Operating%' THEN 'coo'
           ELSE NULL
         END LIMIT 1)
      ) as executive_id,
      ea.proposed_title as position,
      CASE 
        WHEN ea.appointment_type = 'NEW' THEN 'initial'
        WHEN ea.appointment_type = 'REPLACEMENT' THEN 'reappointment'
        WHEN ea.appointment_type = 'INTERIM' THEN 'lateral'
        ELSE 'initial'
      END as appointment_type,
      COALESCE(ea.board_meeting_date::timestamptz, ea.created_at) as appointment_date,
      ea.effective_date::timestamptz as effective_date,
      COALESCE(ea.created_by::text, 'System') as appointed_by,
      COALESCE(ea.board_resolution_id, NULL) as resolution_id,
      CASE 
        WHEN ea.status = 'DRAFT' THEN 'pending'
        WHEN ea.status = 'SENT_TO_BOARD' THEN 'pending'
        WHEN ea.status = 'BOARD_ADOPTED' THEN 'approved'
        WHEN ea.status = 'SECRETARY_APPROVED' THEN 'approved'
        WHEN ea.status = 'ACTIVE' THEN 'active'
        WHEN ea.status = 'APPROVED' THEN 'approved'
        WHEN ea.status = 'REJECTED' THEN 'terminated'
        ELSE 'pending'
      END as status,
      COALESCE(ea.notes, 'Migrated from old schema') as notes,
      ea.created_at
    FROM executive_appointments ea
    WHERE ea.proposed_officer_name IS NOT NULL
      AND NOT EXISTS (
        -- Don't create duplicates
        SELECT 1 FROM executive_appointments new_ea
        WHERE new_ea.executive_id = COALESCE(
          (SELECT id FROM exec_users eu 
           JOIN user_profiles up ON eu.user_id = up.user_id
           WHERE up.email = ea.proposed_officer_email LIMIT 1),
          (SELECT id FROM exec_users eu 
           JOIN user_profiles up ON eu.user_id = up.user_id
           WHERE LOWER(up.full_name) = LOWER(ea.proposed_officer_name) LIMIT 1)
        )
        AND new_ea.position = ea.proposed_title
        AND new_ea.effective_date::date = ea.effective_date
      )
      AND COALESCE(
        (SELECT id FROM exec_users eu 
         JOIN user_profiles up ON eu.user_id = up.user_id
         WHERE up.email = ea.proposed_officer_email LIMIT 1),
        (SELECT id FROM exec_users eu 
         JOIN user_profiles up ON eu.user_id = up.user_id
         WHERE LOWER(up.full_name) = LOWER(ea.proposed_officer_name) LIMIT 1),
        (SELECT id FROM exec_users 
         WHERE role = CASE 
           WHEN ea.proposed_title ILIKE '%CEO%' THEN 'ceo'
           WHEN ea.proposed_title ILIKE '%CFO%' THEN 'cfo'
           WHEN ea.proposed_title ILIKE '%CTO%' THEN 'cto'
           WHEN ea.proposed_title ILIKE '%COO%' THEN 'coo'
           ELSE NULL
         END LIMIT 1)
      ) IS NOT NULL; -- Only migrate if we can find an executive
    
    RAISE NOTICE 'Migration complete';
  ELSE
    RAISE NOTICE 'No old schema data found - table already uses new schema';
  END IF;
END $$;

-- Show migrated appointments
SELECT 
  'MIGRATED APPOINTMENTS' as info,
  ea.id,
  ea.position,
  up.full_name as executive_name,
  ea.status,
  ea.effective_date,
  gbr.resolution_number
FROM executive_appointments ea
JOIN exec_users eu ON ea.executive_id = eu.id
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
LEFT JOIN governance_board_resolutions gbr ON ea.resolution_id = gbr.id
WHERE ea.notes LIKE 'Migrated from old schema%'
ORDER BY ea.created_at DESC;

