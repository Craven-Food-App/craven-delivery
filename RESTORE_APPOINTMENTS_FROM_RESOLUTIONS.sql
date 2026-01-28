-- RESTORE APPOINTMENTS AND OFFICERS FROM RESOLUTIONS
-- This script will create appointments and officers based on existing resolutions

-- ============================================================================
-- PART 1: Check what resolutions exist and what they reference
-- ============================================================================

SELECT 
  'EXISTING RESOLUTIONS' as info,
  id,
  resolution_number,
  title,
  type,
  status,
  meeting_date,
  effective_date,
  related_officer_id,
  created_at
FROM governance_board_resolutions
ORDER BY created_at DESC;

-- ============================================================================
-- PART 2: Check if resolutions reference exec_users that should be appointments
-- ============================================================================

SELECT 
  'RESOLUTIONS WITH RELATED OFFICERS' as info,
  gbr.id as resolution_id,
  gbr.resolution_number,
  gbr.title,
  gbr.type,
  gbr.status,
  gbr.effective_date,
  gbr.related_officer_id,
  eu.id as executive_id,
  eu.title as executive_title,
  eu.role as executive_role,
  up.full_name as executive_name,
  up.email as executive_email
FROM governance_board_resolutions gbr
LEFT JOIN exec_users eu ON eu.id = gbr.related_officer_id::uuid
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
WHERE gbr.related_officer_id IS NOT NULL
ORDER BY gbr.created_at DESC;

-- ============================================================================
-- PART 3: Create appointments from resolutions
-- ============================================================================

-- This will create appointments for resolutions that don't have them
DO $$
DECLARE
  resolution_record RECORD;
  exec_user_record RECORD;
  appointment_exists BOOLEAN;
  new_appointment_id UUID;
  position_text TEXT;
BEGIN
  FOR resolution_record IN 
    SELECT * FROM governance_board_resolutions
    ORDER BY created_at DESC
  LOOP
    -- Try multiple methods to find the executive
    exec_user_record := NULL;
    
    -- Method 1: Use related_officer_id if it exists
    IF resolution_record.related_officer_id IS NOT NULL THEN
      BEGIN
        SELECT * INTO exec_user_record
        FROM exec_users
        WHERE id = resolution_record.related_officer_id::uuid
        LIMIT 1;
        
        IF NOT FOUND THEN
          exec_user_record := NULL;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- If casting fails, try as text
        BEGIN
          SELECT * INTO exec_user_record
          FROM exec_users
          WHERE id::text = resolution_record.related_officer_id
          LIMIT 1;
          
          IF NOT FOUND THEN
            exec_user_record := NULL;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          exec_user_record := NULL;
        END;
      END;
    END IF;
    
    -- Method 2: Try to find executive by matching title/role from resolution title
    -- Check if we need to search (only if exec_user_record wasn't found in Method 1)
    IF exec_user_record IS NULL THEN
      -- Try to match by role in title
      IF resolution_record.title ILIKE '%CEO%' OR resolution_record.title ILIKE '%Chief Executive%' THEN
        SELECT * INTO exec_user_record FROM exec_users WHERE role = 'ceo' LIMIT 1;
        IF NOT FOUND THEN
          exec_user_record := NULL;
        END IF;
      ELSIF resolution_record.title ILIKE '%CFO%' OR resolution_record.title ILIKE '%Chief Financial%' THEN
        SELECT * INTO exec_user_record FROM exec_users WHERE role = 'cfo' LIMIT 1;
        IF NOT FOUND THEN
          exec_user_record := NULL;
        END IF;
      ELSIF resolution_record.title ILIKE '%CTO%' OR resolution_record.title ILIKE '%Chief Technology%' THEN
        SELECT * INTO exec_user_record FROM exec_users WHERE role = 'cto' LIMIT 1;
        IF NOT FOUND THEN
          exec_user_record := NULL;
        END IF;
      ELSIF resolution_record.title ILIKE '%COO%' OR resolution_record.title ILIKE '%Chief Operating%' THEN
        SELECT * INTO exec_user_record FROM exec_users WHERE role = 'coo' LIMIT 1;
        IF NOT FOUND THEN
          exec_user_record := NULL;
        END IF;
      END IF;
    END IF;
    
    -- If we found an executive, create the appointment
    -- Only check exec_user_record.id if the record was assigned
    IF exec_user_record IS NOT NULL THEN
        -- Check if appointment already exists (by resolution_id OR by executive_id + position match)
        SELECT EXISTS (
          SELECT 1 FROM executive_appointments
          WHERE resolution_id = resolution_record.id
             OR (executive_id = exec_user_record.id 
                 AND position ILIKE '%' || exec_user_record.title || '%'
                 AND effective_date::date = COALESCE(resolution_record.effective_date::date, resolution_record.created_at::date))
        ) INTO appointment_exists;
        
        IF NOT appointment_exists THEN
          -- Determine position from resolution title or executive title
          -- Extract position from resolution title first, then fall back to executive title
          position_text := CASE 
            WHEN resolution_record.title ILIKE '%CEO%' OR resolution_record.title ILIKE '%Chief Executive%' THEN 'Chief Executive Officer'
            WHEN resolution_record.title ILIKE '%CFO%' OR resolution_record.title ILIKE '%Chief Financial%' THEN 'Chief Financial Officer'
            WHEN resolution_record.title ILIKE '%CTO%' OR resolution_record.title ILIKE '%Chief Technology%' THEN 'Chief Technology Officer'
            WHEN resolution_record.title ILIKE '%COO%' OR resolution_record.title ILIKE '%Chief Operating%' THEN 'Chief Operating Officer'
            WHEN resolution_record.title ILIKE '%President%' THEN 'President'
            WHEN resolution_record.title ILIKE '%Secretary%' THEN 'Secretary'
            WHEN resolution_record.title ILIKE '%Treasurer%' THEN 'Treasurer'
            ELSE COALESCE(exec_user_record.title, 'Executive')
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
            'Restored from resolution: ' || resolution_record.resolution_number,
            resolution_record.created_at
          )
          RETURNING id INTO new_appointment_id;
          
          RAISE NOTICE '✅ Created appointment % for executive % from resolution %', 
            new_appointment_id, exec_user_record.id, resolution_record.resolution_number;
        ELSE
          RAISE NOTICE '⚠️ Appointment already exists for resolution %', resolution_record.resolution_number;
        END IF;
      ELSE
        RAISE NOTICE '⚠️ Executive not found for resolution % (title: %, type: %)', 
          resolution_record.resolution_number, resolution_record.title, resolution_record.type;
      END IF;
  END LOOP;
END $$;

-- ============================================================================
-- PART 4: Create corporate_officers from appointments
-- ============================================================================

-- Create officers for active/approved appointments that should be Delaware officers
DO $$
DECLARE
  appointment_record RECORD;
  officer_exists BOOLEAN;
  officer_position TEXT;
  new_officer_id UUID;
BEGIN
  FOR appointment_record IN 
    SELECT 
      ea.*,
      eu.id as exec_id,
      eu.user_id
    FROM executive_appointments ea
    JOIN exec_users eu ON ea.executive_id = eu.id
    WHERE ea.status IN ('active', 'approved', 'ACTIVE', 'APPROVED')
      AND NOT EXISTS (
        SELECT 1 FROM corporate_officers co
        WHERE co.executive_id = eu.id
          AND co.status = 'active'
      )
    ORDER BY ea.effective_date DESC
  LOOP
    -- Map position to Delaware officer position
    officer_position := CASE 
      WHEN appointment_record.position ILIKE '%president%' OR appointment_record.position ILIKE '%ceo%' THEN 'president'
      WHEN appointment_record.position ILIKE '%secretary%' THEN 'secretary'
      WHEN appointment_record.position ILIKE '%treasurer%' OR appointment_record.position ILIKE '%cfo%' THEN 'treasurer'
      WHEN appointment_record.position ILIKE '%vice%' OR appointment_record.position ILIKE '%vp%' THEN 'vice-president'
      WHEN appointment_record.position ILIKE '%assistant secretary%' THEN 'assistant-secretary'
      WHEN appointment_record.position ILIKE '%assistant treasurer%' THEN 'assistant-treasurer'
      ELSE NULL
    END;
    
    -- Only create if it's a valid Delaware officer position
    IF officer_position IS NOT NULL THEN
      -- Check if officer already exists
      SELECT EXISTS (
        SELECT 1 FROM corporate_officers
        WHERE executive_id = appointment_record.exec_id
          AND position = officer_position
      ) INTO officer_exists;
      
      IF NOT officer_exists THEN
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
          officer_position,
          appointment_record.exec_id,
          appointment_record.appointment_date,
          appointment_record.effective_date,
          NULL, -- Indefinite term
          appointment_record.resolution_id,
          'active',
          appointment_record.created_at
        )
        RETURNING id INTO new_officer_id;
        
        RAISE NOTICE '✅ Created officer % for executive % (position: %)', 
          new_officer_id, appointment_record.exec_id, officer_position;
      ELSE
        RAISE NOTICE '⚠️ Officer already exists for executive % (position: %)', 
          appointment_record.exec_id, officer_position;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- PART 5: Verification
-- ============================================================================

SELECT 
  'AFTER RESTORATION - SUMMARY' as info,
  (SELECT COUNT(*) FROM executive_appointments) as total_appointments,
  (SELECT COUNT(*) FROM governance_board_resolutions) as total_resolutions,
  (SELECT COUNT(*) FROM corporate_officers) as total_officers,
  (SELECT COUNT(*) FROM executive_appointments WHERE status IN ('active', 'approved')) as active_appointments,
  (SELECT COUNT(*) FROM corporate_officers WHERE status = 'active') as active_officers;

-- Show created appointments
SELECT 
  'CREATED APPOINTMENTS' as info,
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
ORDER BY ea.created_at DESC;

-- Show created officers
SELECT 
  'CREATED OFFICERS' as info,
  co.id,
  co.position,
  up.full_name as executive_name,
  co.status,
  co.appointed_date
FROM corporate_officers co
JOIN exec_users eu ON co.executive_id = eu.id
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
ORDER BY co.created_at DESC;

