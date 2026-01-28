-- RESTORE ALL BACKDATED APPOINTMENTS
-- This script finds and restores appointments from multiple sources:
-- 1. Old appointments table
-- 2. corporate_officers table
-- 3. governance_board_resolutions with appointment type
-- 4. Existing executive_appointments with old schema (proposed_officer_name)

-- ============================================================================
-- PART 1: DIAGNOSTIC - Check all sources of appointment data
-- ============================================================================

-- Check old appointments table
SELECT 
  'OLD APPOINTMENTS TABLE' as source,
  COUNT(*) as count
FROM appointments
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments');

-- Check corporate_officers
SELECT 
  'CORPORATE OFFICERS' as source,
  COUNT(*) as count
FROM corporate_officers;

-- Check appointment resolutions
SELECT 
  'APPOINTMENT RESOLUTIONS' as source,
  COUNT(*) as count
FROM governance_board_resolutions
WHERE type = 'appointment' OR title ILIKE '%appointment%';

-- Check existing executive_appointments
SELECT 
  'EXISTING EXECUTIVE APPOINTMENTS' as source,
  COUNT(*) as count
FROM executive_appointments;

-- ============================================================================
-- PART 2: RESTORE FROM OLD APPOINTMENTS TABLE
-- ============================================================================

DO $$
DECLARE
  appointment_record RECORD;
  exec_user_record RECORD;
  appointment_exists BOOLEAN;
  new_appointment_id UUID;
  position_text TEXT;
  appointment_type_text TEXT;
BEGIN
  -- Only process if old appointments table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
    FOR appointment_record IN 
      SELECT * FROM appointments
      ORDER BY created_at DESC
    LOOP
      -- Find exec_user by appointee_user_id
      SELECT * INTO exec_user_record
      FROM exec_users
      WHERE user_id = appointment_record.appointee_user_id
      LIMIT 1;
      
      -- If exec_user found, create appointment
      IF exec_user_record.id IS NOT NULL THEN
        -- Extract position from role_titles array (use first role)
        position_text := COALESCE(appointment_record.role_titles[1], 'Executive');
        
        -- Determine appointment type based on date
        IF appointment_record.effective_date < appointment_record.created_at THEN
          appointment_type_text := 'initial';
        ELSE
          appointment_type_text := 'initial';
        END IF;
        
        -- Check if appointment already exists for this executive and position
        SELECT EXISTS (
          SELECT 1 FROM executive_appointments
          WHERE executive_id = exec_user_record.id
            AND position = position_text
            AND effective_date = appointment_record.effective_date
        ) INTO appointment_exists;
        
        -- Create appointment if it doesn't exist
        IF NOT appointment_exists THEN
          INSERT INTO executive_appointments (
            executive_id,
            position,
            appointment_type,
            appointment_date,
            effective_date,
            appointed_by,
            status,
            created_at
          ) VALUES (
            exec_user_record.id,
            position_text,
            appointment_type_text,
            appointment_record.created_at,
            appointment_record.effective_date,
            COALESCE(
              (SELECT email FROM auth.users WHERE id = appointment_record.created_by),
              'system'
            ),
            'active', -- Assume active if it's in the old system
            appointment_record.created_at
          )
          RETURNING id INTO new_appointment_id;
          
          RAISE NOTICE 'Created appointment from old appointments table: % for % (%)', 
            new_appointment_id, 
            position_text,
            exec_user_record.id;
        ELSE
          RAISE NOTICE 'Appointment already exists for % (%)', position_text, exec_user_record.id;
        END IF;
      ELSE
        RAISE NOTICE 'No exec_user found for appointee_user_id: %', appointment_record.appointee_user_id;
      END IF;
    END LOOP;
  ELSE
    RAISE NOTICE 'Old appointments table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- PART 3: RESTORE FROM CORPORATE_OFFICERS TABLE
-- ============================================================================

DO $$
DECLARE
  officer_record RECORD;
  appointment_exists BOOLEAN;
  new_appointment_id UUID;
  resolution_record RECORD;
BEGIN
  FOR officer_record IN 
    SELECT * FROM corporate_officers
    WHERE executive_id IS NOT NULL
    ORDER BY appointed_date DESC
  LOOP
    -- Check if appointment already exists
    SELECT EXISTS (
      SELECT 1 FROM executive_appointments
      WHERE executive_id = officer_record.executive_id
        AND position = officer_record.position
        AND effective_date = officer_record.appointed_date
    ) INTO appointment_exists;
    
    -- Create appointment if it doesn't exist
    IF NOT appointment_exists THEN
      -- Try to find related resolution
      SELECT * INTO resolution_record
      FROM governance_board_resolutions
      WHERE related_officer_id = officer_record.executive_id::text
        AND (type = 'appointment' OR title ILIKE '%appointment%')
        AND effective_date = officer_record.appointed_date
      ORDER BY created_at DESC
      LIMIT 1;
      
      INSERT INTO executive_appointments (
        executive_id,
        position,
        appointment_type,
        appointment_date,
        effective_date,
        appointed_by,
        resolution_id,
        status,
        created_at
      ) VALUES (
        officer_record.executive_id,
        officer_record.position,
        'initial',
        COALESCE(officer_record.term_start, officer_record.appointed_date),
        officer_record.appointed_date,
        'system',
        resolution_record.id,
        CASE 
          WHEN officer_record.status = 'active' THEN 'active'
          WHEN officer_record.status = 'terminated' THEN 'terminated'
          ELSE 'approved'
        END,
        COALESCE(officer_record.term_start, officer_record.appointed_date)
      )
      RETURNING id INTO new_appointment_id;
      
      RAISE NOTICE 'Created appointment from corporate_officers: % for % (%)', 
        new_appointment_id, 
        officer_record.position,
        officer_record.executive_id;
    ELSE
      RAISE NOTICE 'Appointment already exists for % (%)', 
        officer_record.position, 
        officer_record.executive_id;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- PART 4: RESTORE FROM GOVERNANCE_BOARD_RESOLUTIONS
-- ============================================================================

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
    WHERE (type = 'appointment' OR title ILIKE '%appointment%')
      AND related_officer_id IS NOT NULL
    ORDER BY created_at DESC
  LOOP
    -- Try to find executive by related_officer_id
    BEGIN
      SELECT * INTO exec_user_record
      FROM exec_users
      WHERE id = resolution_record.related_officer_id::uuid
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      -- If casting fails, try as text
      SELECT * INTO exec_user_record
      FROM exec_users
      WHERE id::text = resolution_record.related_officer_id
      LIMIT 1;
    END;
    
    -- If exec_user not found, try to match by role from title
    IF exec_user_record.id IS NULL THEN
      IF resolution_record.title ILIKE '%CEO%' OR resolution_record.title ILIKE '%Chief Executive%' THEN
        SELECT * INTO exec_user_record FROM exec_users WHERE title ILIKE '%CEO%' OR title ILIKE '%Chief Executive%' LIMIT 1;
      ELSIF resolution_record.title ILIKE '%CFO%' OR resolution_record.title ILIKE '%Chief Financial%' THEN
        SELECT * INTO exec_user_record FROM exec_users WHERE title ILIKE '%CFO%' OR title ILIKE '%Chief Financial%' LIMIT 1;
      ELSIF resolution_record.title ILIKE '%CTO%' OR resolution_record.title ILIKE '%Chief Technology%' THEN
        SELECT * INTO exec_user_record FROM exec_users WHERE title ILIKE '%CTO%' OR title ILIKE '%Chief Technology%' LIMIT 1;
      ELSIF resolution_record.title ILIKE '%COO%' OR resolution_record.title ILIKE '%Chief Operating%' THEN
        SELECT * INTO exec_user_record FROM exec_users WHERE title ILIKE '%COO%' OR title ILIKE '%Chief Operating%' LIMIT 1;
      END IF;
    END IF;
    
    -- Extract position from title if exec_user found
    IF exec_user_record.id IS NOT NULL THEN
      -- Try to extract position from resolution title
      IF resolution_record.title ILIKE '%CEO%' OR resolution_record.title ILIKE '%Chief Executive%' THEN
        position_text := 'Chief Executive Officer';
      ELSIF resolution_record.title ILIKE '%CFO%' OR resolution_record.title ILIKE '%Chief Financial%' THEN
        position_text := 'Chief Financial Officer';
      ELSIF resolution_record.title ILIKE '%CTO%' OR resolution_record.title ILIKE '%Chief Technology%' THEN
        position_text := 'Chief Technology Officer';
      ELSIF resolution_record.title ILIKE '%COO%' OR resolution_record.title ILIKE '%Chief Operating%' THEN
        position_text := 'Chief Operating Officer';
      ELSE
        position_text := COALESCE(exec_user_record.title, 'Executive');
      END IF;
      
      -- Check if appointment already exists
      SELECT EXISTS (
        SELECT 1 FROM executive_appointments
        WHERE executive_id = exec_user_record.id
          AND resolution_id = resolution_record.id
      ) INTO appointment_exists;
      
      -- Create appointment if it doesn't exist
      IF NOT appointment_exists THEN
        INSERT INTO executive_appointments (
          executive_id,
          position,
          appointment_type,
          appointment_date,
          effective_date,
          appointed_by,
          resolution_id,
          status,
          created_at
        ) VALUES (
          exec_user_record.id,
          position_text,
          'initial',
          COALESCE(resolution_record.meeting_date, resolution_record.created_at),
          COALESCE(resolution_record.effective_date, resolution_record.meeting_date, resolution_record.created_at),
          'system',
          resolution_record.id,
          CASE 
            WHEN resolution_record.status = 'ADOPTED' THEN 'approved'
            WHEN resolution_record.status = 'REJECTED' THEN 'terminated'
            ELSE 'pending'
          END,
          resolution_record.created_at
        )
        RETURNING id INTO new_appointment_id;
        
        RAISE NOTICE 'Created appointment from resolution: % for % (%)', 
          new_appointment_id, 
          position_text,
          exec_user_record.id;
      ELSE
        RAISE NOTICE 'Appointment already exists for resolution %', resolution_record.id;
      END IF;
    ELSE
      RAISE NOTICE 'No exec_user found for resolution: % (related_officer_id: %)', 
        resolution_record.id, 
        resolution_record.related_officer_id;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- PART 5: MIGRATE OLD SCHEMA EXECUTIVE_APPOINTMENTS (proposed_officer_name)
-- ============================================================================

DO $$
DECLARE
  old_appointment RECORD;
  exec_user_record RECORD;
  new_appointment_id UUID;
  appointment_exists BOOLEAN;
BEGIN
  -- Check if old schema columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'executive_appointments' 
    AND column_name = 'proposed_officer_name'
  ) THEN
    FOR old_appointment IN 
      SELECT * FROM executive_appointments
      WHERE proposed_officer_name IS NOT NULL
        AND (executive_id IS NULL OR executive_id NOT IN (SELECT id FROM exec_users))
      ORDER BY created_at DESC
    LOOP
      -- Try to find exec_user by email
      IF old_appointment.proposed_officer_email IS NOT NULL THEN
        SELECT eu.* INTO exec_user_record
        FROM exec_users eu
        JOIN user_profiles up ON eu.user_id = up.user_id
        WHERE up.email = old_appointment.proposed_officer_email
        LIMIT 1;
      END IF;
      
      -- If not found by email, try by name
      IF exec_user_record.id IS NULL AND old_appointment.proposed_officer_name IS NOT NULL THEN
        SELECT eu.* INTO exec_user_record
        FROM exec_users eu
        JOIN user_profiles up ON eu.user_id = up.user_id
        WHERE up.full_name ILIKE '%' || old_appointment.proposed_officer_name || '%'
        LIMIT 1;
      END IF;
      
      -- If exec_user found and appointment doesn't exist, create new one
      IF exec_user_record.id IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM executive_appointments
          WHERE executive_id = exec_user_record.id
            AND position = old_appointment.proposed_title
            AND effective_date = old_appointment.effective_date
            AND executive_id IS NOT NULL
        ) INTO appointment_exists;
        
        IF NOT appointment_exists THEN
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
            old_appointment.proposed_title,
            COALESCE(old_appointment.appointment_type, 'initial'),
            COALESCE(old_appointment.board_meeting_date, old_appointment.created_at),
            old_appointment.effective_date,
            COALESCE(
              (SELECT email FROM auth.users WHERE id = old_appointment.created_by),
              'system'
            ),
            old_appointment.board_resolution_id,
            CASE 
              WHEN old_appointment.status IN ('ACTIVE', 'SECRETARY_APPROVED', 'BOARD_ADOPTED') THEN 'active'
              WHEN old_appointment.status = 'REJECTED' THEN 'terminated'
              WHEN old_appointment.status IN ('DRAFT', 'SENT_TO_BOARD', 'AWAITING_SIGNATURES') THEN 'pending'
              ELSE 'approved'
            END,
            old_appointment.notes,
            old_appointment.created_at
          )
          RETURNING id INTO new_appointment_id;
          
          RAISE NOTICE 'Migrated old schema appointment: % for % (%)', 
            new_appointment_id, 
            old_appointment.proposed_title,
            exec_user_record.id;
        END IF;
      END IF;
    END LOOP;
  END IF;
END $$;

-- ============================================================================
-- PART 6: SUMMARY - Show all restored appointments
-- ============================================================================

SELECT 
  'RESTORED APPOINTMENTS SUMMARY' as info,
  COUNT(*) as total_appointments,
  COUNT(*) FILTER (WHERE status = 'active') as active,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'terminated') as terminated
FROM executive_appointments;

-- Show all appointments with executive names
SELECT 
  'ALL APPOINTMENTS' as info,
  ea.id,
  COALESCE(up.full_name, up.email, eu.title, 'Unknown') as executive_name,
  COALESCE(up.email, 'N/A') as executive_email,
  ea.position,
  ea.appointment_type,
  ea.status,
  ea.effective_date,
  ea.resolution_id,
  ea.created_at
FROM executive_appointments ea
LEFT JOIN exec_users eu ON ea.executive_id = eu.id
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
ORDER BY ea.created_at DESC;

