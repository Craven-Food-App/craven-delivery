-- UPDATE JUSTIN SWEET RESOLUTION STATUS
-- Change status to EXECUTED

DO $$
DECLARE
  justin_resolution_id UUID;
  justin_resolution_number TEXT;
  current_status TEXT;
  updated_count INTEGER;
BEGIN
  -- Find Justin Sweet's resolution (2025-0003)
  SELECT id, resolution_number INTO justin_resolution_id, justin_resolution_number
  FROM governance_board_resolutions
  WHERE resolution_number = '2025-0003'
     OR (title ILIKE '%Justin%Sweet%' AND title ILIKE '%CFO%')
  LIMIT 1;

  IF justin_resolution_id IS NULL THEN
    RAISE NOTICE 'Justin Sweet resolution (2025-0003) not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found Justin Sweet resolution: % (number: %)', justin_resolution_id, justin_resolution_number;

  -- Get current status first
  SELECT status INTO current_status
  FROM governance_board_resolutions
  WHERE id = justin_resolution_id;
  
  RAISE NOTICE 'Current status: %', current_status;

  -- Update status to EXECUTED (regardless of current status)
  UPDATE governance_board_resolutions
  SET 
    status = 'EXECUTED',
    updated_at = NOW()
  WHERE id = justin_resolution_id
    AND status != 'EXECUTED';

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count > 0 THEN
    RAISE NOTICE 'Successfully updated Justin Sweet resolution status from % to EXECUTED', current_status;
  ELSE
    RAISE NOTICE 'Resolution is already EXECUTED (no update needed)';
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
  created_at,
  updated_at
FROM governance_board_resolutions
WHERE resolution_number = '2025-0003';

