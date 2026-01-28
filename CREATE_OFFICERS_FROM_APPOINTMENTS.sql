-- CREATE CORPORATE OFFICERS FROM ACTIVE APPOINTMENTS
-- This script creates corporate_officers records for active appointments
-- Torrance (CEO) should be President, Justin (CFO) should be Treasurer

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
      eu.user_id,
      up.full_name as executive_name
    FROM executive_appointments ea
    JOIN exec_users eu ON ea.executive_id = eu.id
    LEFT JOIN user_profiles up ON eu.user_id = up.user_id
    WHERE ea.status IN ('active', 'approved')
      AND NOT EXISTS (
        SELECT 1 FROM corporate_officers co
        WHERE co.executive_id = eu.id
          AND co.status = 'active'
      )
    ORDER BY ea.effective_date DESC
  LOOP
    RAISE NOTICE 'Processing appointment for: % (Position: %)', 
      appointment_record.executive_name, appointment_record.position;
    
    -- Map position to corporate officer position
    -- Use executive titles (CEO, CFO, CTO) directly instead of Delaware statutory positions
    officer_position := CASE 
      WHEN appointment_record.position ILIKE '%ceo%' OR appointment_record.position ILIKE '%Chief Executive%' THEN 'ceo'
      WHEN appointment_record.position ILIKE '%president%' AND NOT appointment_record.position ILIKE '%vice%' THEN 'president'
      WHEN appointment_record.position ILIKE '%cfo%' OR appointment_record.position ILIKE '%Chief Financial%' THEN 'cfo'
      WHEN appointment_record.position ILIKE '%treasurer%' AND NOT appointment_record.position ILIKE '%assistant%' THEN 'treasurer'
      WHEN appointment_record.position ILIKE '%secretary%' AND NOT appointment_record.position ILIKE '%assistant%' THEN 'secretary'
      WHEN appointment_record.position ILIKE '%vice%' OR appointment_record.position ILIKE '%vp%' THEN 'vice-president'
      WHEN appointment_record.position ILIKE '%assistant secretary%' THEN 'assistant-secretary'
      WHEN appointment_record.position ILIKE '%assistant treasurer%' THEN 'assistant-treasurer'
      WHEN appointment_record.position ILIKE '%cto%' OR appointment_record.position ILIKE '%Chief Technology%' THEN 'cto'
      ELSE NULL
    END;
    
    -- Only create if it's a valid Delaware officer position
    IF officer_position IS NOT NULL THEN
      -- Check if officer already exists
      SELECT EXISTS (
        SELECT 1 FROM corporate_officers
        WHERE executive_id = appointment_record.exec_id
          AND position = officer_position
          AND status = 'active'
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
        
        RAISE NOTICE '✅ Created officer % for % (position: %)', 
          new_officer_id, appointment_record.executive_name, officer_position;
      ELSE
        RAISE NOTICE '⚠️ Officer already exists for % (position: %)', 
          appointment_record.executive_name, officer_position;
      END IF;
    ELSE
      RAISE NOTICE '⚠️ Position "%" does not map to a corporate officer position, skipping', 
        appointment_record.position;
    END IF;
  END LOOP;
END $$;

-- Verify officers were created
SELECT 
  'VERIFICATION - CORPORATE OFFICERS' as info,
  co.id,
  co.position,
  co.status,
  co.appointed_date,
  up.full_name as executive_name,
  up.email as executive_email,
  eu.title as executive_title,
  gbr.resolution_number
FROM corporate_officers co
JOIN exec_users eu ON co.executive_id = eu.id
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
LEFT JOIN governance_board_resolutions gbr ON co.resolution_id = gbr.id
WHERE co.status = 'active'
ORDER BY co.appointed_date DESC;

