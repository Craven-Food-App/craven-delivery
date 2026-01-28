-- CREATE APPOINTMENT FROM RESOLUTION 2025-0001
-- This script specifically creates an appointment for Torrance Stroman as CEO
-- from the existing resolution 2025-0001

DO $$
DECLARE
  resolution_record RECORD;
  exec_user_record RECORD;
  appointment_record RECORD;
  appointment_exists BOOLEAN;
  new_appointment_id UUID;
  position_text TEXT;
BEGIN
  -- Find the resolution
  SELECT * INTO resolution_record
  FROM governance_board_resolutions
  WHERE resolution_number = '2025-0001'
     OR title ILIKE '%Torrance Stroman%CEO%'
  LIMIT 1;
  
  IF resolution_record.id IS NULL THEN
    RAISE NOTICE '❌ Resolution 2025-0001 not found';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Found resolution: % - %', resolution_record.resolution_number, resolution_record.title;
  
  -- Find Torrance Stroman's exec_user record
  SELECT * INTO exec_user_record
  FROM exec_users eu
  LEFT JOIN user_profiles up ON eu.user_id = up.user_id
  WHERE up.email ILIKE '%torrance%'
     OR up.email ILIKE '%tstroman%'
     OR up.full_name ILIKE '%torrance%'
     OR eu.title ILIKE '%CEO%'
     OR eu.role = 'ceo'
  ORDER BY 
    CASE 
      WHEN up.email ILIKE '%tstroman.ceo%' THEN 1
      WHEN up.email ILIKE '%torrance%' THEN 2
      WHEN eu.title ILIKE '%CEO%' THEN 3
      ELSE 4
    END
  LIMIT 1;
  
  IF exec_user_record.id IS NULL THEN
    RAISE NOTICE '❌ Torrance Stroman exec_user not found';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Found executive: % (ID: %)', exec_user_record.title, exec_user_record.id;
  
  -- Check if appointment already exists
  SELECT EXISTS (
    SELECT 1 FROM executive_appointments
    WHERE resolution_id = resolution_record.id
       OR (executive_id = exec_user_record.id 
           AND position ILIKE '%CEO%'
           AND effective_date::date = COALESCE(resolution_record.effective_date::date, resolution_record.created_at::date))
  ) INTO appointment_exists;
  
  IF appointment_exists THEN
    RAISE NOTICE '⚠️ Appointment already exists for this resolution/executive';
    
    -- Show existing appointment
    FOR appointment_record IN
      SELECT id, position, status, effective_date
      FROM executive_appointments
      WHERE resolution_id = resolution_record.id
         OR (executive_id = exec_user_record.id AND position ILIKE '%CEO%')
      LIMIT 1
    LOOP
      RAISE NOTICE '   Existing appointment ID: %, Position: %, Status: %', 
        appointment_record.id, appointment_record.position, appointment_record.status;
    END LOOP;
    RETURN;
  END IF;
  
  -- Determine position
  position_text := 'Chief Executive Officer';
  
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
      WHEN resolution_record.status = 'ADOPTED' OR resolution_record.status = 'EXECUTED' THEN 'ACTIVE'
      WHEN resolution_record.status = 'REJECTED' THEN 'REJECTED'
      WHEN resolution_record.status = 'PENDING_VOTE' THEN 'SENT_TO_BOARD'
      ELSE 'ACTIVE'
    END,
    'Restored from resolution: ' || resolution_record.resolution_number || ' - ' || resolution_record.title,
    resolution_record.created_at
  )
  RETURNING id INTO new_appointment_id;
  
  RAISE NOTICE '✅ Created appointment % for Torrance Stroman as CEO from resolution %', 
    new_appointment_id, resolution_record.resolution_number;
    
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
END $$;

-- Verify the appointment was created
SELECT 
  'VERIFICATION' as info,
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
WHERE gbr.resolution_number = '2025-0001'
   OR (up.full_name ILIKE '%torrance%' AND ea.position ILIKE '%CEO%')
ORDER BY ea.created_at DESC
LIMIT 5;

