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

-- 2. Check if there are any rows with old schema columns
-- (This will fail if columns don't exist, but that's okay - we'll know the schema)
SELECT 
  'OLD SCHEMA DATA CHECK' as info,
  COUNT(*) FILTER (WHERE proposed_officer_name IS NOT NULL) as has_proposed_officer_name,
  COUNT(*) FILTER (WHERE proposed_title IS NOT NULL) as has_proposed_title,
  COUNT(*) FILTER (WHERE board_resolution_id IS NOT NULL) as has_board_resolution_id,
  COUNT(*) FILTER (WHERE executive_id IS NOT NULL) as has_executive_id,
  COUNT(*) FILTER (WHERE position IS NOT NULL) as has_position,
  COUNT(*) as total_rows
FROM executive_appointments;

-- 3. Show all appointment data (try both schemas)
SELECT 
  'ALL APPOINTMENT DATA' as info,
  id,
  -- New schema columns
  executive_id,
  position,
  appointment_type,
  status,
  effective_date,
  resolution_id,
  created_at,
  -- Old schema columns (if they exist)
  proposed_officer_name,
  proposed_title,
  board_resolution_id
FROM executive_appointments
ORDER BY created_at DESC
LIMIT 20;

-- 4. Check if there's data in the old appointments table
SELECT 
  'OLD APPOINTMENTS TABLE' as info,
  COUNT(*) as count
FROM appointments
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments');

-- 5. Check board_resolutions table (might have appointment data)
SELECT 
  'BOARD_RESOLUTIONS (old table)' as info,
  COUNT(*) as count
FROM board_resolutions
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'board_resolutions')
  AND resolution_type = 'appointment';

