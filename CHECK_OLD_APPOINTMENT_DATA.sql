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

-- 5. Check if old appointments table exists and show ALL data with names
SELECT 
  'OLD APPOINTMENTS TABLE DATA' as info,
  a.id,
  a.appointee_user_id,
  a.role_titles,
  a.effective_date,
  COALESCE(up.full_name, up.first_name || ' ' || up.last_name, e.email, 'Unknown') as appointee_name,
  e.email as appointee_email,
  a.created_at
FROM appointments a
LEFT JOIN user_profiles up ON a.appointee_user_id = up.user_id
LEFT JOIN auth.users e ON a.appointee_user_id = e.id
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments')
ORDER BY a.created_at DESC;

-- 6. Check corporate_officers for Torrance and Justin
SELECT 
  'CORPORATE OFFICERS' as info,
  co.id,
  co.position,
  co.status,
  co.appointed_date,
  COALESCE(up.full_name, up.first_name || ' ' || up.last_name, eu.title, 'Unknown') as officer_name,
  COALESCE(up.email, 'N/A') as officer_email,
  eu.title as executive_title,
  eu.id as executive_id
FROM corporate_officers co
LEFT JOIN exec_users eu ON co.executive_id = eu.id
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
ORDER BY co.appointed_date DESC;

-- 7. Check exec_users for Torrance and Justin
SELECT 
  'EXEC_USERS (Torrance & Justin)' as info,
  eu.id,
  eu.user_id,
  eu.title,
  COALESCE(up.full_name, up.first_name || ' ' || up.last_name, 'Unknown') as name,
  COALESCE(up.email, e.email, 'N/A') as email
FROM exec_users eu
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
LEFT JOIN auth.users e ON eu.user_id = e.id
WHERE up.email ILIKE '%torrance%' 
   OR up.email ILIKE '%tstroman%'
   OR up.email ILIKE '%justin%'
   OR up.email ILIKE '%sweet%'
   OR up.full_name ILIKE '%torrance%'
   OR up.full_name ILIKE '%justin%'
   OR e.email ILIKE '%torrance%'
   OR e.email ILIKE '%tstroman%'
   OR e.email ILIKE '%justin%'
   OR e.email ILIKE '%sweet%';

-- 8. Check governance_board_resolutions for appointment resolutions
SELECT 
  'APPOINTMENT RESOLUTIONS' as info,
  gbr.id,
  gbr.resolution_number,
  gbr.title,
  gbr.type,
  gbr.status,
  gbr.meeting_date,
  gbr.effective_date,
  gbr.related_officer_id,
  gbr.created_at
FROM governance_board_resolutions gbr
WHERE gbr.type = 'appointment' 
   OR gbr.title ILIKE '%appointment%'
   OR gbr.title ILIKE '%torrance%'
   OR gbr.title ILIKE '%justin%'
   OR gbr.title ILIKE '%CEO%'
   OR gbr.title ILIKE '%CFO%'
ORDER BY gbr.created_at DESC;

-- 9. Check if appointments exist in old table but not in new executive_appointments
SELECT 
  'MISSING APPOINTMENTS (in old table, not in new)' as info,
  a.id as old_appointment_id,
  a.appointee_user_id,
  a.role_titles,
  COALESCE(up.full_name, up.first_name || ' ' || up.last_name, e.email, 'Unknown') as appointee_name,
  COALESCE(up.email, e.email, 'N/A') as appointee_email,
  a.effective_date,
  a.created_at
FROM appointments a
LEFT JOIN user_profiles up ON a.appointee_user_id = up.user_id
LEFT JOIN auth.users e ON a.appointee_user_id = e.id
LEFT JOIN exec_users eu ON a.appointee_user_id = eu.user_id
LEFT JOIN executive_appointments ea ON eu.id = ea.executive_id
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments')
  AND ea.id IS NULL  -- Not in new table
ORDER BY a.created_at DESC;

