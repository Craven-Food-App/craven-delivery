-- RESTORE ALL BACKDATED BOARD DATA
-- This script finds and restores board data from multiple sources:
-- 1. exec_users with board_member role
-- 2. corporate_officers who are also board members
-- 3. governance_board_resolutions (for board meetings context)
-- 4. Existing board_members table
-- 5. board_resolution_votes
-- 6. board_meetings (if any exist)

-- ============================================================================
-- PART 1: DIAGNOSTIC - Check all sources of board data
-- ============================================================================

-- Check exec_users with board_member role
SELECT 
  'EXEC_USERS (BOARD MEMBERS)' as source,
  COUNT(*) as count
FROM exec_users
WHERE role = 'board_member';

-- Check existing board_members
SELECT 
  'EXISTING BOARD_MEMBERS' as source,
  COUNT(*) as count
FROM board_members;

-- Check board resolution votes
SELECT 
  'BOARD RESOLUTION VOTES' as source,
  COUNT(*) as count
FROM board_resolution_votes;

-- Check board meetings
SELECT 
  'BOARD MEETINGS' as source,
  COUNT(*) as count
FROM board_meetings
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'board_meetings');

-- Check governance resolutions (for board context)
SELECT 
  'GOVERNANCE RESOLUTIONS' as source,
  COUNT(*) as count
FROM governance_board_resolutions;

-- ============================================================================
-- PART 2: RESTORE BOARD MEMBERS FROM EXEC_USERS
-- ============================================================================

DO $$
DECLARE
  exec_user_record RECORD;
  board_member_exists BOOLEAN;
  new_board_member_id UUID;
  user_profile_record RECORD;
  auth_user_record RECORD;
BEGIN
  FOR exec_user_record IN 
    SELECT * FROM exec_users
    WHERE role = 'board_member'
    ORDER BY created_at DESC
  LOOP
    -- Get user profile for name and email
    SELECT * INTO user_profile_record
    FROM user_profiles
    WHERE user_id = exec_user_record.user_id
    LIMIT 1;
    
    -- Get auth user for email fallback
    SELECT * INTO auth_user_record
    FROM auth.users
    WHERE id = exec_user_record.user_id
    LIMIT 1;
    
    -- Check if board member already exists
    SELECT EXISTS (
      SELECT 1 FROM board_members
      WHERE user_id = exec_user_record.user_id
        OR email = COALESCE(user_profile_record.email, auth_user_record.email, '')
    ) INTO board_member_exists;
    
    -- Create board member if it doesn't exist
    IF NOT board_member_exists THEN
      INSERT INTO board_members (
        user_id,
        full_name,
        email,
        role_title,
        appointment_date,
        status,
        signing_required,
        signing_completed,
        created_at
      ) VALUES (
        exec_user_record.user_id,
        COALESCE(
          user_profile_record.full_name,
          CASE 
            WHEN auth_user_record.email IS NOT NULL THEN SPLIT_PART(auth_user_record.email, '@', 1)
            ELSE NULL
          END,
          exec_user_record.title,
          'Board Member'
        ),
        COALESCE(
          user_profile_record.email,
          auth_user_record.email,
          'unknown@example.com'
        ),
        COALESCE(exec_user_record.title, 'Director'),
        COALESCE(exec_user_record.approved_at, exec_user_record.created_at)::date,
        'Active',
        true,
        false,
        exec_user_record.created_at
      )
      RETURNING id INTO new_board_member_id;
      
      RAISE NOTICE 'Created board member from exec_users: % for % (%)', 
        new_board_member_id, 
        COALESCE(user_profile_record.full_name, 'Unknown'),
        exec_user_record.user_id;
    ELSE
      RAISE NOTICE 'Board member already exists for exec_user: %', exec_user_record.user_id;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- PART 3: RESTORE BOARD MEMBERS FROM CORPORATE_OFFICERS (if they're also board members)
-- ============================================================================

DO $$
DECLARE
  officer_record RECORD;
  board_member_exists BOOLEAN;
  new_board_member_id UUID;
  exec_user_record RECORD;
  user_profile_record RECORD;
BEGIN
  FOR officer_record IN 
    SELECT * FROM corporate_officers
    WHERE executive_id IS NOT NULL
      AND position IN ('Chief Executive Officer', 'CEO', 'President', 'Chairman')
    ORDER BY appointed_date DESC
  LOOP
    -- Get exec_user
    SELECT * INTO exec_user_record
    FROM exec_users
    WHERE id = officer_record.executive_id
    LIMIT 1;
    
    -- Get user profile
    IF exec_user_record.id IS NOT NULL THEN
      SELECT * INTO user_profile_record
      FROM user_profiles
      WHERE user_id = exec_user_record.user_id
      LIMIT 1;
      
      -- Check if board member already exists
      SELECT EXISTS (
        SELECT 1 FROM board_members
        WHERE user_id = exec_user_record.user_id
      ) INTO board_member_exists;
      
      -- Create board member if CEO/President (typically board chair)
      IF NOT board_member_exists AND exec_user_record.user_id IS NOT NULL THEN
        INSERT INTO board_members (
          user_id,
          full_name,
          email,
          role_title,
          appointment_date,
          status,
          signing_required,
          signing_completed,
          created_at
        ) VALUES (
          exec_user_record.user_id,
          COALESCE(user_profile_record.full_name, 'Board Chair'),
          COALESCE(user_profile_record.email, 'unknown@example.com'),
          'Board Chair',
          officer_record.appointed_date,
          CASE WHEN officer_record.status = 'active' THEN 'Active' ELSE 'Removed' END,
          true,
          false,
          officer_record.appointed_date
        )
        RETURNING id INTO new_board_member_id;
        
        RAISE NOTICE 'Created board member from corporate_officers: % for %', 
          new_board_member_id, 
          COALESCE(user_profile_record.full_name, 'Board Chair');
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- PART 4: RESTORE BOARD MEETINGS FROM RESOLUTIONS
-- ============================================================================

DO $$
DECLARE
  resolution_record RECORD;
  meeting_exists BOOLEAN;
  new_meeting_id UUID;
BEGIN
  -- Only process if board_meetings table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'board_meetings') THEN
    FOR resolution_record IN 
      SELECT * FROM governance_board_resolutions
      WHERE meeting_date IS NOT NULL
      ORDER BY meeting_date DESC
    LOOP
      -- Check if meeting already exists for this date
      SELECT EXISTS (
        SELECT 1 FROM board_meetings
        WHERE scheduled_at::date = resolution_record.meeting_date::date
          AND title ILIKE '%' || resolution_record.title || '%'
      ) INTO meeting_exists;
      
      -- Create meeting if it doesn't exist
      IF NOT meeting_exists THEN
        INSERT INTO board_meetings (
          title,
          description,
          scheduled_at,
          duration_minutes,
          status,
          created_at
        ) VALUES (
          'Board Meeting - ' || resolution_record.title,
          'Board meeting to discuss: ' || COALESCE(resolution_record.title, 'Agenda items'),
          resolution_record.meeting_date,
          60, -- Default 60 minutes
          'completed', -- Assume completed if it's in the past
          resolution_record.created_at
        )
        RETURNING id INTO new_meeting_id;
        
        RAISE NOTICE 'Created board meeting from resolution: % for %', 
          new_meeting_id, 
          resolution_record.meeting_date;
      ELSE
        RAISE NOTICE 'Board meeting already exists for date: %', resolution_record.meeting_date;
      END IF;
    END LOOP;
  ELSE
    RAISE NOTICE 'board_meetings table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- PART 5: ENSURE BOARD MEMBERS ARE LINKED TO VOTES
-- ============================================================================

DO $$
DECLARE
  vote_record RECORD;
  board_member_record RECORD;
  exec_user_record RECORD;
  new_board_member_id UUID;
BEGIN
  -- Find votes that don't have valid board_member_id
  FOR vote_record IN 
    SELECT brv.*, gbr.related_officer_id
    FROM board_resolution_votes brv
    LEFT JOIN governance_board_resolutions gbr ON brv.resolution_id = gbr.id
    WHERE NOT EXISTS (
      SELECT 1 FROM board_members WHERE id = brv.board_member_id
    )
  LOOP
    -- Try to find board member by related_officer_id from resolution
    IF vote_record.related_officer_id IS NOT NULL THEN
      BEGIN
        SELECT * INTO exec_user_record
        FROM exec_users
        WHERE id = vote_record.related_officer_id::uuid
        LIMIT 1;
      EXCEPTION WHEN OTHERS THEN
        SELECT * INTO exec_user_record
        FROM exec_users
        WHERE id::text = vote_record.related_officer_id
        LIMIT 1;
      END;
      
      IF exec_user_record.id IS NOT NULL THEN
        -- Find or create board member
        SELECT * INTO board_member_record
        FROM board_members
        WHERE user_id = exec_user_record.user_id
        LIMIT 1;
        
        -- If board member doesn't exist, create it
        IF board_member_record.id IS NULL THEN
          INSERT INTO board_members (
            user_id,
            full_name,
            email,
            role_title,
            appointment_date,
            status,
            created_at
          )
          SELECT 
            exec_user_record.user_id,
            COALESCE(up.full_name, e.email, 'Board Member'),
            COALESCE(up.email, e.email, 'unknown@example.com'),
            COALESCE(exec_user_record.title, 'Director'),
            COALESCE(exec_user_record.approved_at, exec_user_record.created_at)::date,
            'Active',
            exec_user_record.created_at
          FROM exec_users eu
          LEFT JOIN user_profiles up ON eu.user_id = up.user_id
          LEFT JOIN auth.users e ON eu.user_id = e.id
          WHERE eu.id = exec_user_record.id
          RETURNING id INTO new_board_member_id;
          
          -- Update vote with new board_member_id
          UPDATE board_resolution_votes
          SET board_member_id = new_board_member_id
          WHERE id = vote_record.id;
          
          RAISE NOTICE 'Created board member and linked vote: %', new_board_member_id;
        ELSE
          -- Update vote with existing board_member_id
          UPDATE board_resolution_votes
          SET board_member_id = board_member_record.id
          WHERE id = vote_record.id;
          
          RAISE NOTICE 'Linked vote to existing board member: %', board_member_record.id;
        END IF;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- PART 6: SUMMARY - Show all restored board data
-- ============================================================================

SELECT 
  'RESTORED BOARD DATA SUMMARY' as info,
  (SELECT COUNT(*) FROM board_members) as total_board_members,
  (SELECT COUNT(*) FROM board_members WHERE status = 'Active') as active_members,
  (SELECT COUNT(*) FROM board_resolution_votes) as total_votes,
  (SELECT COUNT(*) FROM board_meetings WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'board_meetings')) as total_meetings;

-- Show all board members
SELECT 
  'ALL BOARD MEMBERS' as info,
  bm.id,
  bm.full_name,
  bm.email,
  bm.role_title,
  bm.status,
  bm.appointment_date,
  bm.signing_completed,
  bm.created_at
FROM board_members bm
ORDER BY bm.appointment_date DESC;

-- Show board resolution votes with member names
SELECT 
  'BOARD VOTES' as info,
  brv.id,
  gbr.resolution_number,
  gbr.title as resolution_title,
  bm.full_name as board_member_name,
  brv.vote,
  brv.comment,
  brv.created_at
FROM board_resolution_votes brv
LEFT JOIN governance_board_resolutions gbr ON brv.resolution_id = gbr.id
LEFT JOIN board_members bm ON brv.board_member_id = bm.id
ORDER BY brv.created_at DESC
LIMIT 50;

-- Show board meetings
SELECT 
  'BOARD MEETINGS' as info,
  id,
  title,
  scheduled_at,
  duration_minutes,
  status,
  created_at
FROM board_meetings
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'board_meetings')
ORDER BY scheduled_at DESC
LIMIT 20;

