-- CHECK FOR OLD APPOINTMENT DATA
-- This checks if there's old appointment data that needs to be migrated

-- 1. Check what columns actually exist in executive_appointments
SELECT 
  'EXECUTIVE_APPOINTMENTS COLUMNS' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'executive_appointments'
ORDER BY ordinal_position;

-- 2. Check current schema and data
SELECT 
  'CURRENT APPOINTMENT DATA' as info,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE executive_id IS NOT NULL) as has_executive_id,
  COUNT(*) FILTER (WHERE position IS NOT NULL) as has_position,
  COUNT(*) FILTER (WHERE resolution_id IS NOT NULL) as has_resolution_id
FROM executive_appointments;

-- 3. Show all appointment data (new schema)
SELECT 
  'ALL APPOINTMENT DATA' as info,
  ea.id,
  ea.executive_id,
  ea.position,
  ea.appointment_type,
  ea.status,
  ea.effective_date,
  ea.resolution_id,
  up.full_name as executive_name,
  up.email as executive_email,
  gbr.resolution_number,
  ea.created_at
FROM executive_appointments ea
LEFT JOIN exec_users eu ON ea.executive_id = eu.id
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
LEFT JOIN governance_board_resolutions gbr ON ea.resolution_id = gbr.id
ORDER BY ea.created_at DESC
LIMIT 20;

-- 4. Check if there's data in the old appointments table
DO $$
DECLARE
  appointments_count INTEGER := 0;
  board_resolutions_count INTEGER := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
    SELECT COUNT(*) INTO appointments_count FROM appointments;
    RAISE NOTICE 'OLD APPOINTMENTS TABLE: % rows', appointments_count;
  ELSE
    RAISE NOTICE 'OLD APPOINTMENTS TABLE: does not exist';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'board_resolutions') THEN
    SELECT COUNT(*) INTO board_resolutions_count FROM board_resolutions WHERE resolution_type = 'appointment';
    RAISE NOTICE 'BOARD_RESOLUTIONS (old table) with appointment type: % rows', board_resolutions_count;
  ELSE
    RAISE NOTICE 'BOARD_RESOLUTIONS (old table): does not exist';
  END IF;
END $$;

-- 5. Check if old appointments table exists and show data
SELECT 
  'OLD APPOINTMENTS TABLE DATA' as info,
  id,
  appointee_user_id,
  role_titles,
  effective_date,
  created_at
FROM appointments
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments')
ORDER BY created_at DESC
LIMIT 20;

