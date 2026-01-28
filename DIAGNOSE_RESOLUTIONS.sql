-- DIAGNOSE RESOLUTIONS - See what data exists and why appointments aren't being created

-- 1. Show all resolutions with their details
SELECT 
  'ALL RESOLUTIONS' as info,
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

-- 2. Check if related_officer_id matches any exec_users
SELECT 
  'RESOLUTION TO EXEC_USER MATCHING' as info,
  gbr.id as resolution_id,
  gbr.resolution_number,
  gbr.title,
  gbr.type,
  gbr.related_officer_id,
  CASE 
    WHEN gbr.related_officer_id IS NULL THEN '❌ No related_officer_id'
    WHEN eu.id IS NOT NULL THEN '✅ Matches exec_user'
    ELSE '❌ related_officer_id does not match any exec_user'
  END as match_status,
  eu.id as exec_user_id,
  eu.title as exec_user_title,
  eu.role as exec_user_role
FROM governance_board_resolutions gbr
LEFT JOIN exec_users eu ON eu.id = gbr.related_officer_id::uuid
ORDER BY gbr.created_at DESC;

-- 3. Check what exec_users exist
SELECT 
  'AVAILABLE EXEC_USERS' as info,
  id,
  title,
  role,
  user_id
FROM exec_users
ORDER BY created_at DESC;

-- 4. Check if resolutions match the type filter
SELECT 
  'RESOLUTION TYPE CHECK' as info,
  type,
  COUNT(*) as count,
  CASE 
    WHEN type = 'EXECUTIVE_APPOINTMENT' THEN '✅ Will match'
    WHEN type ILIKE '%appointment%' THEN '✅ Will match'
    ELSE '❌ Will NOT match'
  END as will_create_appointment
FROM governance_board_resolutions
GROUP BY type;

-- 5. Check metadata field (might contain appointment info)
SELECT 
  'RESOLUTION METADATA' as info,
  id,
  resolution_number,
  title,
  type,
  metadata
FROM governance_board_resolutions
WHERE metadata IS NOT NULL
ORDER BY created_at DESC;

