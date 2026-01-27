-- CHECK EXISTING GOVERNANCE DATA
-- Run this to see what appointment, resolution, and officer data exists

-- 1. Check executive_appointments
SELECT 
  'EXECUTIVE APPOINTMENTS' as table_name,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'active') as active,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'terminated') as terminated
FROM executive_appointments;

-- Show all appointments
SELECT 
  'APPOINTMENT DETAILS' as info,
  id,
  CASE 
    WHEN proposed_officer_name IS NOT NULL THEN proposed_officer_name
    ELSE (SELECT name FROM exec_users WHERE id = executive_id)
  END as officer_name,
  CASE 
    WHEN proposed_title IS NOT NULL THEN proposed_title
    ELSE position
  END as position,
  appointment_type,
  status,
  effective_date,
  board_resolution_id,
  created_at
FROM executive_appointments
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check governance_board_resolutions
SELECT 
  'GOVERNANCE BOARD RESOLUTIONS' as table_name,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'DRAFT') as draft,
  COUNT(*) FILTER (WHERE status = 'PENDING_VOTE') as pending_vote,
  COUNT(*) FILTER (WHERE status = 'ADOPTED') as adopted,
  COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected
FROM governance_board_resolutions;

-- Show all resolutions
SELECT 
  'RESOLUTION DETAILS' as info,
  id,
  resolution_number,
  title,
  type,
  status,
  meeting_date,
  effective_date,
  created_at
FROM governance_board_resolutions
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check corporate_officers
SELECT 
  'CORPORATE OFFICERS' as table_name,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'active') as active,
  COUNT(*) FILTER (WHERE status = 'terminated') as terminated
FROM corporate_officers;

-- Show all officers with executive info
SELECT 
  'OFFICER DETAILS' as info,
  co.id,
  co.position,
  co.status,
  co.appointed_date,
  co.term_start,
  co.term_end,
  eu.name as executive_name,
  eu.email as executive_email,
  eu.title as executive_title
FROM corporate_officers co
LEFT JOIN exec_users eu ON co.executive_id = eu.id
ORDER BY co.appointed_date DESC
LIMIT 20;

-- 4. Check for orphaned data (appointments without resolutions, etc.)
SELECT 
  'ORPHANED APPOINTMENTS (no resolution)' as info,
  COUNT(*) as count
FROM executive_appointments
WHERE board_resolution_id IS NULL AND resolution_id IS NULL;

SELECT 
  'APPOINTMENTS WITH RESOLUTIONS' as info,
  COUNT(*) as count
FROM executive_appointments
WHERE board_resolution_id IS NOT NULL OR resolution_id IS NOT NULL;

-- 5. Summary
SELECT 
  'SUMMARY' as info,
  (SELECT COUNT(*) FROM executive_appointments) as total_appointments,
  (SELECT COUNT(*) FROM governance_board_resolutions) as total_resolutions,
  (SELECT COUNT(*) FROM corporate_officers) as total_officers,
  (SELECT COUNT(*) FROM executive_appointments WHERE status = 'active') as active_appointments,
  (SELECT COUNT(*) FROM corporate_officers WHERE status = 'active') as active_officers;

