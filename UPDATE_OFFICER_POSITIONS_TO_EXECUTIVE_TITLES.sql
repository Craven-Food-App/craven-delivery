-- UPDATE EXISTING OFFICER POSITIONS TO USE EXECUTIVE TITLES
-- Updates Torrance Stroman (CEO) from 'president' to 'ceo'
-- Updates Justin Sweet (CFO) from 'treasurer' to 'cfo'
--
-- IMPORTANT: This script first updates the constraint to allow CEO, CFO, and CTO positions
-- then updates the existing records

-- Step 1: Update the CHECK constraint to allow executive titles
ALTER TABLE corporate_officers 
  DROP CONSTRAINT IF EXISTS corporate_officers_position_check;

ALTER TABLE corporate_officers 
  ADD CONSTRAINT corporate_officers_position_check 
  CHECK (position IN ('president', 'secretary', 'treasurer', 'vice-president', 'assistant-secretary', 'assistant-treasurer', 'ceo', 'cfo', 'cto'));

-- Step 2: Update existing records
DO $$
DECLARE
  torrance_user_id UUID;
  torrance_exec_user_id UUID;
  justin_user_id UUID;
  justin_exec_user_id UUID;
  updated_count INTEGER;
BEGIN
  -- Find Torrance Stroman (CEO)
  SELECT id INTO torrance_user_id
  FROM auth.users
  WHERE email = 'tstroman.ceo@cravenusa.com'
  LIMIT 1;

  IF torrance_user_id IS NOT NULL THEN
    SELECT id INTO torrance_exec_user_id
    FROM exec_users
    WHERE user_id = torrance_user_id
    LIMIT 1;

    IF torrance_exec_user_id IS NOT NULL THEN
      -- Update Torrance from 'president' to 'ceo'
      UPDATE corporate_officers
      SET 
        position = 'ceo',
        updated_at = NOW()
      WHERE executive_id = torrance_exec_user_id
        AND position = 'president'
        AND status = 'active';
      
      GET DIAGNOSTICS updated_count = ROW_COUNT;
      
      IF updated_count > 0 THEN
        RAISE NOTICE '✅ Updated Torrance Stroman position from president to ceo';
      ELSE
        RAISE NOTICE 'ℹ️ Torrance Stroman already has position ceo or no active record found';
      END IF;
    END IF;
  END IF;

  -- Find Justin Sweet (CFO)
  SELECT id INTO justin_user_id
  FROM auth.users
  WHERE email = 'jsweet.cfo@cravenusa.com'
  LIMIT 1;

  IF justin_user_id IS NOT NULL THEN
    SELECT id INTO justin_exec_user_id
    FROM exec_users
    WHERE user_id = justin_user_id
    LIMIT 1;

    IF justin_exec_user_id IS NOT NULL THEN
      -- Update Justin from 'treasurer' to 'cfo'
      UPDATE corporate_officers
      SET 
        position = 'cfo',
        updated_at = NOW()
      WHERE executive_id = justin_exec_user_id
        AND position = 'treasurer'
        AND status = 'active';
      
      GET DIAGNOSTICS updated_count = ROW_COUNT;
      
      IF updated_count > 0 THEN
        RAISE NOTICE '✅ Updated Justin Sweet position from treasurer to cfo';
      ELSE
        RAISE NOTICE 'ℹ️ Justin Sweet already has position cfo or no active record found';
      END IF;
    END IF;
  END IF;
END $$;

-- Verify the updates
SELECT 
  'VERIFICATION - OFFICER POSITIONS' as info,
  co.position,
  co.status,
  up.full_name as executive_name,
  up.email as executive_email,
  eu.title as executive_title
FROM corporate_officers co
JOIN exec_users eu ON co.executive_id = eu.id
LEFT JOIN user_profiles up ON eu.user_id = up.user_id
WHERE co.status = 'active'
  AND (up.email IN ('tstroman.ceo@cravenusa.com', 'jsweet.cfo@cravenusa.com'))
ORDER BY co.position;

