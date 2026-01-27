-- CHECK EXISTING GOVERNANCE DATA
-- Run this to see what appointment, resolution, and officer data exists

-- 1. Check executive_appointments (handle both old and new schema)
SELECT 
  'EXECUTIVE APPOINTMENTS' as table_name,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status IN ('pending', 'DRAFT', 'SENT_TO_BOARD', 'AWAITING_SIGNATURES')) as pending,
  COUNT(*) FILTER (WHERE status IN ('active', 'ACTIVE')) as active,
  COUNT(*) FILTER (WHERE status IN ('approved', 'APPROVED', 'BOARD_ADOPTED', 'SECRETARY_APPROVED')) as approved,
  COUNT(*) FILTER (WHERE status IN ('terminated', 'REJECTED', 'TERMINATED')) as terminated
FROM executive_appointments;

-- Show all appointments (new schema with executive_id)
-- Join with exec_users and user_profiles to get names
SELECT 
  'APPOINTMENT DETAILS' as info,
  ea.id,
  COALESCE(up.full_name, eu.title, 'Unknown') as officer_name,
  COALESCE(up.email, 'N/A') as officer_email,
  ea.position,
  ea.appointment_type,
  ea.status,
  ea.effective_date,
  ea.resolution_id,
  ea.appointed_by,
  ea.created_at
FROM executive_appointments ea
LEFT JOIN exec_users eu ON ea.executive_id = eu.id
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
ORDER BY ea.created_at DESC
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
  COALESCE(up.full_name, eu.title, 'Unknown') as executive_name,
  COALESCE(up.email, 'N/A') as executive_email,
  eu.title as executive_title
FROM corporate_officers co
LEFT JOIN exec_users eu ON co.executive_id = eu.id
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
ORDER BY co.appointed_date DESC
LIMIT 20;

-- 4. Check for orphaned data (appointments without resolutions, etc.)
SELECT 
  'ORPHANED APPOINTMENTS (no resolution)' as info,
  COUNT(*) as count
FROM executive_appointments
WHERE COALESCE(board_resolution_id, resolution_id) IS NULL;

SELECT 
  'APPOINTMENTS WITH RESOLUTIONS' as info,
  COUNT(*) as count
FROM executive_appointments
WHERE COALESCE(board_resolution_id, resolution_id) IS NOT NULL;

-- 5. Summary
SELECT 
  'SUMMARY' as info,
  (SELECT COUNT(*) FROM executive_appointments) as total_appointments,
  (SELECT COUNT(*) FROM governance_board_resolutions) as total_resolutions,
  (SELECT COUNT(*) FROM corporate_officers) as total_officers,
  (SELECT COUNT(*) FROM executive_appointments WHERE status IN ('active', 'ACTIVE')) as active_appointments,
  (SELECT COUNT(*) FROM corporate_officers WHERE status = 'active') as active_officers;

