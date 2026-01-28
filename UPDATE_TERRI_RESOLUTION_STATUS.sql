-- UPDATE TERRI CRAWFORD RESOLUTION STATUS
-- Change status from ADOPTED to PENDING_VOTE since she hasn't signed or confirmed reception

DO $$
DECLARE
  terri_resolution_id UUID;
  current_status TEXT;
  updated_count INTEGER;
BEGIN
  -- Find Terri Crawford's resolution
  -- Try by resolution number first (BR-2025-9262)
  SELECT id INTO terri_resolution_id
  FROM governance_board_resolutions
  WHERE resolution_number = 'BR-2025-9262'
     OR resolution_number = '2025-9262'
     OR title ILIKE '%Terri%L%Crawford%'
     OR title ILIKE '%Terri%Crawford%'
     OR (title ILIKE '%CXO%' AND description ILIKE '%Terri%')
  LIMIT 1;

  IF terri_resolution_id IS NULL THEN
    RAISE NOTICE 'Terri Crawford resolution not found';
    RAISE NOTICE 'Searching for all CXO appointments...';
    
    -- List all CXO resolutions for debugging
    SELECT id, resolution_number, title, status, meeting_date
    FROM governance_board_resolutions
    WHERE title ILIKE '%CXO%'
    ORDER BY created_at DESC;
    
    RETURN;
  END IF;

  RAISE NOTICE 'Found Terri Crawford resolution: %', terri_resolution_id;

  -- Update status from ADOPTED to PENDING_VOTE
  UPDATE governance_board_resolutions
  SET 
    status = 'PENDING_VOTE',
    updated_at = NOW()
  WHERE id = terri_resolution_id
    AND status = 'ADOPTED';

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count > 0 THEN
    RAISE NOTICE 'Successfully updated Terri Crawford resolution status from ADOPTED to PENDING_VOTE';
  ELSE
    RAISE NOTICE 'Resolution found but status was not ADOPTED (current status may be different)';
    
    -- Show current status
    SELECT status INTO current_status
    FROM governance_board_resolutions
    WHERE id = terri_resolution_id;
    
    RAISE NOTICE 'Current status: %', current_status;
  END IF;

END $$;

-- Verify the update
SELECT 
  resolution_number,
  title,
  status,
  meeting_date,
  effective_date,
  type,
  created_at
FROM governance_board_resolutions
WHERE resolution_number IN ('BR-2025-9262', '2025-9262')
   OR title ILIKE '%Terri%L%Crawford%'
   OR title ILIKE '%Terri%Crawford%CXO%'
ORDER BY created_at DESC
LIMIT 5;

