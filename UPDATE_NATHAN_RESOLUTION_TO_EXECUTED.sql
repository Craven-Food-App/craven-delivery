-- UPDATE NATHAN CURRY RESOLUTION STATUS
-- Change status from ADOPTED to EXECUTED and create governance log entry

DO $$
DECLARE
  nathan_resolution_id UUID;
  nathan_resolution_number TEXT;
  torrance_user_id UUID;
  updated_count INTEGER;
  log_id UUID;
BEGIN
  -- Find Nathan Curry's resolution (2025-0002)
  SELECT id, resolution_number INTO nathan_resolution_id, nathan_resolution_number
  FROM governance_board_resolutions
  WHERE resolution_number = '2025-0002'
     OR (title ILIKE '%Nathan%Curry%' AND title ILIKE '%CTO%')
  LIMIT 1;

  IF nathan_resolution_id IS NULL THEN
    RAISE NOTICE 'Nathan Curry resolution (2025-0002) not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found Nathan Curry resolution: % (number: %)', nathan_resolution_id, nathan_resolution_number;

  -- Get Torrance's user_id for performed_by (CEO who executed it)
  SELECT id INTO torrance_user_id
  FROM auth.users
  WHERE email = 'tstroman.ceo@cravenusa.com'
  LIMIT 1;

  -- Update status from ADOPTED to EXECUTED
  UPDATE governance_board_resolutions
  SET 
    status = 'EXECUTED',
    updated_at = NOW()
  WHERE id = nathan_resolution_id
    AND status = 'ADOPTED';

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count > 0 THEN
    RAISE NOTICE 'Successfully updated Nathan Curry resolution status from ADOPTED to EXECUTED';
  ELSE
    RAISE NOTICE 'Resolution found but status was not ADOPTED';
  END IF;

  -- Create governance log entry for 11/18/2025
  -- Check if log entry already exists for this resolution on this date
  SELECT id INTO log_id
  FROM governance_log
  WHERE target_type = 'resolution'
    AND target_id = nathan_resolution_id
    AND action_type = 'resolution_executed'
    AND DATE(performed_at) = '2025-11-18'
  LIMIT 1;

  IF log_id IS NULL THEN
    -- Insert new log entry
    INSERT INTO governance_log (
      action_type,
      action_category,
      target_type,
      target_id,
      target_name,
      description,
      metadata,
      performed_by,
      performed_at
    ) VALUES (
      'resolution_executed',
      'board',
      'resolution',
      nathan_resolution_id,
      'Resolution ' || nathan_resolution_number || ' - Appointment of Nathan Curry as CTO',
      'Resolution executed: Appointment of Nathan Curry as Chief Technology Officer (CTO). Documents sent to executive on 2025-11-18.',
      jsonb_build_object(
        'resolution_number', nathan_resolution_number,
        'executive_name', 'Nathan Curry',
        'position', 'Chief Technology Officer',
        'execution_date', '2025-11-18',
        'previous_status', 'ADOPTED',
        'new_status', 'EXECUTED'
      ),
      torrance_user_id,
      '2025-11-18 12:00:00+00'::timestamptz
    )
    RETURNING id INTO log_id;

    RAISE NOTICE 'Created governance log entry: %', log_id;
  ELSE
    RAISE NOTICE 'Governance log entry already exists for this resolution on 2025-11-18: %', log_id;
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
WHERE resolution_number = '2025-0002';

-- Verify the log entry
SELECT 
  id,
  action_type,
  action_category,
  target_type,
  target_name,
  description,
  performed_at,
  performed_by
FROM governance_log
WHERE target_type = 'resolution'
  AND target_id IN (
    SELECT id FROM governance_board_resolutions WHERE resolution_number = '2025-0002'
  )
ORDER BY performed_at DESC
LIMIT 5;

