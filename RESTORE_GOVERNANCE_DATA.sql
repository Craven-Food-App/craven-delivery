-- RESTORE GOVERNANCE DATA
-- This script helps identify and restore appointment, resolution, and officer data
-- Run CHECK_GOVERNANCE_DATA.sql first to see what data exists

-- ============================================================================
-- PART 1: Check for appointments that need to be linked to resolutions
-- ============================================================================

-- Find appointments with board_resolution_id that don't have matching resolutions
SELECT 
  'APPOINTMENTS WITH MISSING RESOLUTIONS' as info,
  ea.id,
  ea.proposed_officer_name,
  ea.proposed_title,
  ea.board_resolution_id,
  ea.status
FROM executive_appointments ea
WHERE ea.board_resolution_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM governance_board_resolutions gbr
    WHERE gbr.id = ea.board_resolution_id
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

-- Find appointments that need to be linked to exec_users
SELECT 
  'APPOINTMENTS NEEDING EXECUTIVE LINK' as info,
  ea.id,
  ea.proposed_officer_name,
  ea.proposed_officer_email,
  ea.proposed_title,
  CASE 
    WHEN eu.id IS NOT NULL THEN '✅ Linked'
    ELSE '❌ Not Linked'
  END as link_status,
  eu.id as executive_id,
  eu.name as executive_name
FROM executive_appointments ea
LEFT JOIN exec_users eu ON (
  eu.email = ea.proposed_officer_email 
  OR LOWER(eu.name) = LOWER(ea.proposed_officer_name)
)
WHERE ea.executive_id IS NULL
LIMIT 20;

-- ============================================================================
-- PART 4: Create corporate_officers from active appointments
-- ============================================================================

-- Find active appointments that should have corresponding corporate_officers entries
SELECT 
  'APPOINTMENTS THAT SHOULD BE OFFICERS' as info,
  ea.id as appointment_id,
  ea.proposed_title,
  ea.proposed_officer_name,
  CASE 
    WHEN co.id IS NOT NULL THEN '✅ Officer exists'
    ELSE '❌ No officer entry'
  END as officer_status,
  co.id as officer_id,
  co.position as officer_position
FROM executive_appointments ea
LEFT JOIN exec_users eu ON (
  eu.email = ea.proposed_officer_email 
  OR LOWER(eu.name) = LOWER(ea.proposed_officer_name)
)
LEFT JOIN corporate_officers co ON co.executive_id = eu.id
WHERE ea.status IN ('ACTIVE', 'APPROVED', 'active', 'approved')
  AND ea.proposed_title IN (
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

-- This shows how to map appointment titles to Delaware officer positions
SELECT 
  'TITLE TO POSITION MAPPING' as info,
  ea.proposed_title,
  CASE 
    WHEN ea.proposed_title ILIKE '%president%' OR ea.proposed_title ILIKE '%ceo%' THEN 'president'
    WHEN ea.proposed_title ILIKE '%secretary%' THEN 'secretary'
    WHEN ea.proposed_title ILIKE '%treasurer%' OR ea.proposed_title ILIKE '%cfo%' THEN 'treasurer'
    WHEN ea.proposed_title ILIKE '%vice%' OR ea.proposed_title ILIKE '%vp%' THEN 'vice-president'
    WHEN ea.proposed_title ILIKE '%assistant secretary%' THEN 'assistant-secretary'
    WHEN ea.proposed_title ILIKE '%assistant treasurer%' THEN 'assistant-treasurer'
    ELSE NULL
  END as suggested_position,
  COUNT(*) as count
FROM executive_appointments ea
WHERE ea.proposed_title IS NOT NULL
GROUP BY ea.proposed_title
ORDER BY count DESC;

-- ============================================================================
-- PART 6: Summary of what needs to be restored
-- ============================================================================

SELECT 
  'RESTORATION SUMMARY' as info,
  (SELECT COUNT(*) FROM executive_appointments WHERE executive_id IS NULL) as appointments_without_executive,
  (SELECT COUNT(*) FROM executive_appointments WHERE board_resolution_id IS NOT NULL 
   AND NOT EXISTS (SELECT 1 FROM governance_board_resolutions WHERE id = executive_appointments.board_resolution_id)) as appointments_with_missing_resolutions,
  (SELECT COUNT(*) FROM executive_appointments WHERE status IN ('ACTIVE', 'APPROVED', 'active', 'approved')
   AND NOT EXISTS (
     SELECT 1 FROM corporate_officers co
     JOIN exec_users eu ON co.executive_id = eu.id
     WHERE (eu.email = executive_appointments.proposed_officer_email 
            OR LOWER(eu.name) = LOWER(executive_appointments.proposed_officer_name))
   )) as active_appointments_without_officers,
  (SELECT COUNT(*) FROM board_resolutions WHERE NOT EXISTS (
     SELECT 1 FROM governance_board_resolutions 
     WHERE resolution_number = board_resolutions.resolution_number
   )) as resolutions_to_migrate;

