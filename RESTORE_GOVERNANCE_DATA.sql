-- RESTORE GOVERNANCE DATA
-- This script helps identify and restore appointment, resolution, and officer data
-- Run CHECK_GOVERNANCE_DATA.sql first to see what data exists

-- ============================================================================
-- PART 1: Check for appointments that need to be linked to resolutions
-- ============================================================================

-- Find appointments with resolution_id that don't have matching resolutions
SELECT 
  'APPOINTMENTS WITH MISSING RESOLUTIONS' as info,
  ea.id,
  ea.position,
  eu.title as executive_title,
  ea.resolution_id,
  ea.status
FROM executive_appointments ea
LEFT JOIN exec_users eu ON ea.executive_id = eu.id
WHERE ea.resolution_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM governance_board_resolutions gbr
    WHERE gbr.id = ea.resolution_id
  )
LIMIT 10;

-- ============================================================================
-- PART 2: Create resolutions from appointments that have resolution numbers
-- ============================================================================

-- If appointments have board_resolution_id but resolution doesn't exist in governance_board_resolutions,
-- we can create them (but be careful - this assumes the data is correct)

-- First, check if there are any board_resolutions that need to be migrated
SELECT 
  'BOARD_RESOLUTIONS TO MIGRATE' as info,
  COUNT(*) as count
FROM board_resolutions br
WHERE NOT EXISTS (
  SELECT 1 FROM governance_board_resolutions gbr
  WHERE gbr.resolution_number = br.resolution_number
);

-- ============================================================================
-- PART 3: Link appointments to executives in exec_users
-- ============================================================================

-- Find appointments that are already linked to exec_users
SELECT 
  'APPOINTMENT EXECUTIVE LINKS' as info,
  ea.id,
  ea.position,
  eu.id as executive_id,
  eu.title as executive_title,
  up.full_name as executive_name,
  up.email as executive_email,
  CASE 
    WHEN eu.id IS NOT NULL THEN '✅ Linked'
    ELSE '❌ Not Linked'
  END as link_status
FROM executive_appointments ea
LEFT JOIN exec_users eu ON ea.executive_id = eu.id
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
LIMIT 20;

-- ============================================================================
-- PART 4: Create corporate_officers from active appointments
-- ============================================================================

-- Find active appointments that should have corresponding corporate_officers entries
SELECT 
  'APPOINTMENTS THAT SHOULD BE OFFICERS' as info,
  ea.id as appointment_id,
  ea.position,
  up.full_name as executive_name,
  CASE 
    WHEN co.id IS NOT NULL THEN '✅ Officer exists'
    ELSE '❌ No officer entry'
  END as officer_status,
  co.id as officer_id,
  co.position as officer_position
FROM executive_appointments ea
LEFT JOIN exec_users eu ON ea.executive_id = eu.id
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
LEFT JOIN corporate_officers co ON co.executive_id = eu.id
WHERE ea.status IN ('ACTIVE', 'APPROVED', 'active', 'approved')
  AND ea.position IN (
    'President', 'Chief Executive Officer', 'CEO',
    'Secretary', 'Corporate Secretary',
    'Treasurer', 'Chief Financial Officer', 'CFO',
    'Vice President', 'VP',
    'Assistant Secretary',
    'Assistant Treasurer'
  )
LIMIT 20;

-- ============================================================================
-- PART 5: Map appointment titles to officer positions
-- ============================================================================

-- This shows how to map appointment positions to Delaware officer positions
SELECT 
  'POSITION TO OFFICER MAPPING' as info,
  ea.position,
  CASE 
    WHEN ea.position ILIKE '%president%' OR ea.position ILIKE '%ceo%' THEN 'president'
    WHEN ea.position ILIKE '%secretary%' THEN 'secretary'
    WHEN ea.position ILIKE '%treasurer%' OR ea.position ILIKE '%cfo%' THEN 'treasurer'
    WHEN ea.position ILIKE '%vice%' OR ea.position ILIKE '%vp%' THEN 'vice-president'
    WHEN ea.position ILIKE '%assistant secretary%' THEN 'assistant-secretary'
    WHEN ea.position ILIKE '%assistant treasurer%' THEN 'assistant-treasurer'
    ELSE NULL
  END as suggested_officer_position,
  COUNT(*) as count
FROM executive_appointments ea
WHERE ea.position IS NOT NULL
GROUP BY ea.position
ORDER BY count DESC;

-- ============================================================================
-- PART 6: Summary of what needs to be restored
-- ============================================================================

SELECT 
  'RESTORATION SUMMARY' as info,
  (SELECT COUNT(*) FROM executive_appointments WHERE executive_id IS NULL) as appointments_without_executive,
  (SELECT COUNT(*) FROM executive_appointments WHERE resolution_id IS NOT NULL 
   AND NOT EXISTS (SELECT 1 FROM governance_board_resolutions WHERE id = executive_appointments.resolution_id)) as appointments_with_missing_resolutions,
  (SELECT COUNT(*) FROM executive_appointments ea
   JOIN exec_users eu ON ea.executive_id = eu.id
   WHERE ea.status IN ('ACTIVE', 'APPROVED', 'active', 'approved')
   AND NOT EXISTS (
     SELECT 1 FROM corporate_officers co
     WHERE co.executive_id = eu.id
   )) as active_appointments_without_officers,
  (SELECT COUNT(*) FROM board_resolutions WHERE NOT EXISTS (
     SELECT 1 FROM governance_board_resolutions 
     WHERE resolution_number = board_resolutions.resolution_number
   )) as resolutions_to_migrate;

