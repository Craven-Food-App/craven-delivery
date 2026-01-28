-- CREATE APPOINTMENT FROM RESOLUTION FOR JUSTIN SWEET
-- This script creates an appointment for Justin Sweet as CFO
-- from existing resolutions

DO $$
DECLARE
  resolution_record RECORD;
  exec_user_record RECORD;
  appointment_record RECORD;
  appointment_exists BOOLEAN;
  new_appointment_id UUID;
  position_text TEXT;
BEGIN
  -- Find resolutions for Justin Sweet (CFO)
  FOR resolution_record IN
    SELECT * FROM governance_board_resolutions
    WHERE title ILIKE '%Justin Sweet%'
       OR title ILIKE '%Justin%CFO%'
       OR title ILIKE '%Chief Financial%Justin%'
       OR (type = 'EXECUTIVE_APPOINTMENT' AND title ILIKE '%CFO%')
    ORDER BY created_at DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '🔍 Checking resolution: % - %', resolution_record.resolution_number, resolution_record.title;
    
    -- Find Justin Sweet's exec_user record
    SELECT * INTO exec_user_record
    FROM exec_users eu
    LEFT JOIN user_profiles up ON eu.user_id = up.user_id
    WHERE up.email ILIKE '%justin%'
       OR up.email ILIKE '%sweet%'
       OR up.full_name ILIKE '%justin%sweet%'
       OR up.full_name ILIKE '%justin%'
       OR eu.title ILIKE '%CFO%'
       OR eu.role = 'cfo'
    ORDER BY 
      CASE 
        WHEN up.email ILIKE '%justin%sweet%' THEN 1
        WHEN up.full_name ILIKE '%justin%sweet%' THEN 2
        WHEN up.email ILIKE '%justin%' THEN 3
        WHEN up.full_name ILIKE '%justin%' THEN 4
        WHEN eu.title ILIKE '%CFO%' THEN 5
        ELSE 6
      END
    LIMIT 1;
    
    IF NOT FOUND OR exec_user_record.id IS NULL THEN
      RAISE NOTICE '❌ Justin Sweet exec_user not found for resolution %', resolution_record.resolution_number;
      CONTINUE;
    END IF;
    
    RAISE NOTICE '✅ Found executive: % (ID: %)', exec_user_record.title, exec_user_record.id;
    
    -- Check if appointment already exists
    SELECT EXISTS (
      SELECT 1 FROM executive_appointments
      WHERE resolution_id = resolution_record.id
         OR (executive_id = exec_user_record.id 
             AND position ILIKE '%CFO%'
             AND effective_date::date = COALESCE(resolution_record.effective_date::date, resolution_record.created_at::date))
    ) INTO appointment_exists;
    
    IF appointment_exists THEN
      RAISE NOTICE '⚠️ Appointment already exists for this resolution/executive';
      
      -- Show existing appointment
      FOR appointment_record IN
        SELECT id, position, status, effective_date
        FROM executive_appointments
        WHERE resolution_id = resolution_record.id
           OR (executive_id = exec_user_record.id AND position ILIKE '%CFO%')
        LIMIT 1
      LOOP
        RAISE NOTICE '   Existing appointment ID: %, Position: %, Status: %', 
          appointment_record.id, appointment_record.position, appointment_record.status;
      END LOOP;
      CONTINUE;
    END IF;
    
    -- Determine position
    position_text := CASE 
      WHEN resolution_record.title ILIKE '%CFO%' OR resolution_record.title ILIKE '%Chief Financial%' THEN 'Chief Financial Officer'
      WHEN resolution_record.title ILIKE '%Treasurer%' THEN 'Treasurer'
      ELSE COALESCE(exec_user_record.title, 'Chief Financial Officer')
    END;
    
    -- Create appointment
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
    ) VALUES (
      exec_user_record.id,
      position_text,
      'initial',
      COALESCE(resolution_record.meeting_date::timestamptz, resolution_record.created_at),
      COALESCE(resolution_record.effective_date::timestamptz, resolution_record.created_at),
      COALESCE(resolution_record.created_by::text, 'System'),
      resolution_record.id,
      CASE 
        WHEN resolution_record.status = 'ADOPTED' OR resolution_record.status = 'EXECUTED' THEN 'active'
        WHEN resolution_record.status = 'REJECTED' THEN 'terminated'
        WHEN resolution_record.status = 'PENDING_VOTE' THEN 'pending'
        ELSE 'active'
      END,
      'Restored from resolution: ' || resolution_record.resolution_number || ' - ' || resolution_record.title,
      resolution_record.created_at
    )
    RETURNING id INTO new_appointment_id;
    
    RAISE NOTICE '✅ Created appointment % for Justin Sweet as % from resolution %', 
      new_appointment_id, position_text, resolution_record.resolution_number;
      
    -- Show the created appointment
    FOR appointment_record IN
      SELECT 
        ea.id,
        ea.position,
        ea.status,
        ea.effective_date,
        up.full_name as executive_name,
        gbr.resolution_number
      FROM executive_appointments ea
      JOIN exec_users eu ON ea.executive_id = eu.id
      LEFT JOIN user_profiles up ON eu.user_id = up.user_id
      LEFT JOIN governance_board_resolutions gbr ON ea.resolution_id = gbr.id
      WHERE ea.id = new_appointment_id
    LOOP
      RAISE NOTICE '   Appointment Details:';
      RAISE NOTICE '   - ID: %', appointment_record.id;
      RAISE NOTICE '   - Executive: %', appointment_record.executive_name;
      RAISE NOTICE '   - Position: %', appointment_record.position;
      RAISE NOTICE '   - Status: %', appointment_record.status;
      RAISE NOTICE '   - Effective Date: %', appointment_record.effective_date;
      RAISE NOTICE '   - Resolution: %', appointment_record.resolution_number;
    END LOOP;
  END LOOP;
END $$;

-- Verify the appointment was created
SELECT 
  'VERIFICATION - JUSTIN SWEET APPOINTMENTS' as info,
  ea.id,
  ea.position,
  ea.status,
  ea.effective_date,
  up.full_name as executive_name,
  up.email as executive_email,
  gbr.resolution_number,
  gbr.title as resolution_title
FROM executive_appointments ea
JOIN exec_users eu ON ea.executive_id = eu.id
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
LEFT JOIN governance_board_resolutions gbr ON ea.resolution_id = gbr.id
WHERE (up.full_name ILIKE '%justin%' OR up.email ILIKE '%justin%')
   AND ea.position ILIKE '%CFO%'
ORDER BY ea.created_at DESC
LIMIT 5;

