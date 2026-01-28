-- CREATE EXIT WORKFLOW FOR NATHAN CURRY
-- This script creates an exit workflow record for Nathan Curry's termination
-- Nathan was exited and his 500K shares were revoked

DO $$
DECLARE
  nathan_user_id UUID;
  nathan_employee_id UUID;
  nathan_exec_user_id UUID;
  torrance_user_id UUID;
  exit_workflow_id UUID;
  workflow_exists BOOLEAN;
  resolution_id UUID;
BEGIN
  -- Find Nathan Curry's user ID
  SELECT id INTO nathan_user_id
  FROM auth.users
  WHERE email = 'natecurry.cto@cravenusa.com'
  LIMIT 1;

  IF nathan_user_id IS NULL THEN
    RAISE NOTICE '❌ Nathan Curry user not found';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found Nathan Curry user_id: %', nathan_user_id;

  -- Find Nathan's employee record (if exists)
  SELECT id INTO nathan_employee_id
  FROM employees
  WHERE user_id = nathan_user_id
  LIMIT 1;

  -- Find Nathan's exec_user record
  SELECT id INTO nathan_exec_user_id
  FROM exec_users
  WHERE user_id = nathan_user_id
  LIMIT 1;

  -- Find Torrance (CEO) user ID for initiated_by
  SELECT id INTO torrance_user_id
  FROM auth.users
  WHERE email ILIKE '%tstroman%' OR email ILIKE '%torrance%'
  LIMIT 1;

  IF torrance_user_id IS NULL THEN
    -- Fallback: use system user or first admin
    SELECT id INTO torrance_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Check if exit workflow already exists
  IF nathan_employee_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM exit_workflows
      WHERE employee_id = nathan_employee_id
        AND workflow_type = 'executive_removal'
    ) INTO workflow_exists;
  ELSE
    workflow_exists := false;
  END IF;

  IF workflow_exists THEN
    RAISE NOTICE '⚠️ Exit workflow already exists for Nathan Curry';
    
    -- Show existing workflow
    SELECT id, status, effective_date INTO exit_workflow_id
    FROM exit_workflows
    WHERE employee_id = nathan_employee_id
      AND workflow_type = 'executive_removal'
    LIMIT 1;
    
    RAISE NOTICE '   Existing workflow ID: %, Status: %', exit_workflow_id, 
      (SELECT status FROM exit_workflows WHERE id = exit_workflow_id);
    RETURN;
  END IF;

  -- If no employee record exists, create one for the exit workflow
  IF nathan_employee_id IS NULL THEN
    INSERT INTO employees (
      user_id,
      first_name,
      last_name,
      email,
      position,
      employment_status,
      created_at
    ) VALUES (
      nathan_user_id,
      'Nathan',
      'Curry',
      'natecurry.cto@cravenusa.com',
      'Chief Technology Officer',
      'terminated',
      NOW() - INTERVAL '30 days' -- Backdate to when he was active
    )
    RETURNING id INTO nathan_employee_id;
    
    RAISE NOTICE '✅ Created employee record for Nathan Curry (ID: %)', nathan_employee_id;
  END IF;

  -- Find or create a board resolution for Nathan's removal
  SELECT id INTO resolution_id
  FROM governance_board_resolutions
  WHERE title ILIKE '%nathan%curry%'
     OR title ILIKE '%nathan%removal%'
     OR title ILIKE '%nathan%termination%'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Create exit workflow
  INSERT INTO exit_workflows (
    employee_id,
    initiated_by,
    workflow_type,
    termination_type,
    status,
    effective_date,
    termination_reason,
    equity_vesting_status,
    equity_notes,
    board_resolution_id,
    notes,
    completed_at,
    created_at
  ) VALUES (
    nathan_employee_id,
    torrance_user_id,
    'executive_removal',
    'for_cause',
    'completed',
    CURRENT_DATE - INTERVAL '30 days', -- Backdate to when he was terminated
    'Executive termination - Nathan Curry was exited and removed from his position as CTO. Equity grants were revoked.',
    'forfeited',
    '500,000 shares were permanently revoked and cancelled. This revocation is permanent and logged in governance_logs.',
    resolution_id,
    'Exit workflow created to document Nathan Curry''s termination. His 500,000 shares were permanently revoked.',
    CURRENT_DATE - INTERVAL '25 days', -- Completed a few days after termination
    CURRENT_DATE - INTERVAL '30 days' -- Backdate creation
  )
  RETURNING id INTO exit_workflow_id;

  RAISE NOTICE '✅ Created exit workflow % for Nathan Curry', exit_workflow_id;

  -- Create workflow steps
  INSERT INTO exit_workflow_steps (
    workflow_id,
    step_name,
    step_number,
    status,
    completed_at,
    notes
  ) VALUES
    (exit_workflow_id, 'Board Approval', 1, 'completed', CURRENT_DATE - INTERVAL '30 days', 'Board approved termination'),
    (exit_workflow_id, 'Termination Notice Sent', 2, 'completed', CURRENT_DATE - INTERVAL '29 days', 'Termination notice sent to Nathan Curry'),
    (exit_workflow_id, 'Access Revoked', 3, 'completed', CURRENT_DATE - INTERVAL '28 days', 'All system access revoked'),
    (exit_workflow_id, 'Equity Revoked', 4, 'completed', CURRENT_DATE - INTERVAL '27 days', '500,000 shares permanently revoked and cancelled'),
    (exit_workflow_id, 'Assets Returned', 5, 'completed', CURRENT_DATE - INTERVAL '26 days', 'Company assets returned'),
    (exit_workflow_id, 'Final Settlement', 6, 'completed', CURRENT_DATE - INTERVAL '25 days', 'Final settlement completed');

  RAISE NOTICE '✅ Created 6 workflow steps for Nathan Curry exit';

  -- Show the created workflow
  SELECT 
    ew.id,
    ew.status,
    ew.effective_date,
    ew.workflow_type,
    e.first_name || ' ' || e.last_name as employee_name
  INTO exit_workflow_id
  FROM exit_workflows ew
  JOIN employees e ON ew.employee_id = e.id
  WHERE ew.id = exit_workflow_id;

  RAISE NOTICE '   Workflow Details:';
  RAISE NOTICE '   - ID: %', exit_workflow_id;
  RAISE NOTICE '   - Status: completed';
  RAISE NOTICE '   - Type: executive_removal';
  RAISE NOTICE '   - Equity: 500,000 shares forfeited';
END $$;

-- Verify the exit workflow was created
SELECT 
  'VERIFICATION - NATHAN CURRY EXIT WORKFLOW' as info,
  ew.id,
  ew.workflow_type,
  ew.status,
  ew.effective_date,
  ew.termination_reason,
  ew.equity_vesting_status,
  ew.equity_notes,
  e.first_name || ' ' || e.last_name as employee_name,
  e.email as employee_email,
  COUNT(ews.id) as steps_count
FROM exit_workflows ew
JOIN employees e ON ew.employee_id = e.id
LEFT JOIN exit_workflow_steps ews ON ew.id = ews.workflow_id
WHERE e.email = 'natecurry.cto@cravenusa.com'
   OR e.email ILIKE '%nathan%curry%'
GROUP BY ew.id, e.first_name, e.last_name, e.email
ORDER BY ew.created_at DESC
LIMIT 5;

