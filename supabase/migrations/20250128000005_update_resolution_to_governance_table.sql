-- Update board resolution creation to use governance_board_resolutions table
-- This ensures resolutions created by exit workflows appear in the Board Resolutions UI

-- Update the function to create resolutions in governance_board_resolutions
CREATE OR REPLACE FUNCTION public.create_board_resolution_for_removal(
  p_workflow_id UUID,
  p_employee_id UUID,
  p_employee_name TEXT,
  p_employee_position TEXT,
  p_employee_email TEXT,
  p_termination_type TEXT,
  p_termination_reason TEXT,
  p_grounds_for_cause TEXT[] DEFAULT NULL,
  p_created_by UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resolution_id UUID;
  v_resolution_number TEXT;
  v_year TEXT;
  v_count INTEGER;
  v_resolution_title TEXT;
  v_resolution_description TEXT;
BEGIN
  -- Generate resolution number (check both tables for uniqueness)
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Get max resolution number from governance_board_resolutions
  SELECT COALESCE(MAX(CAST(SUBSTRING(resolution_number FROM LENGTH(v_year) + 2 FOR 4) AS INTEGER)), 0)
  INTO v_count
  FROM public.governance_board_resolutions
  WHERE resolution_number LIKE v_year || '-%';
  
  -- Also check board_resolutions to ensure no conflicts
  SELECT GREATEST(v_count, COALESCE(MAX(CAST(SUBSTRING(resolution_number FROM LENGTH(v_year) + 2 FOR 4) AS INTEGER)), 0))
  INTO v_count
  FROM public.board_resolutions
  WHERE resolution_number LIKE v_year || '-%';
  
  v_count := v_count + 1;
  v_resolution_number := v_year || '-' || LPAD(v_count::TEXT, 4, '0');
  
  -- Prepare resolution text
  v_resolution_title := 'Removal of ' || p_employee_name || ' as ' || p_employee_position;
  
  IF p_termination_type = 'for_cause' THEN
    v_resolution_description := 'Resolution to remove ' || p_employee_name || 
      ' from the position of ' || p_employee_position || ' for cause. ' ||
      'Grounds: ' || COALESCE(array_to_string(p_grounds_for_cause, ', '), 'N/A') || '. ' ||
      'Reason: ' || COALESCE(p_termination_reason, 'N/A');
  ELSE
    v_resolution_description := 'Resolution to remove ' || p_employee_name || 
      ' from the position of ' || p_employee_position || ' without cause. ' ||
      'Reason: ' || COALESCE(p_termination_reason, 'N/A');
  END IF;
  
  -- Insert into governance_board_resolutions (the table the UI uses)
  INSERT INTO public.governance_board_resolutions (
    resolution_number,
    title,
    description,
    type,
    status,
    created_by,
    effective_date,
    metadata
  ) VALUES (
    v_resolution_number,
    v_resolution_title,
    v_resolution_description,
    'EXECUTIVE_REMOVAL',
    'PENDING_VOTE',
    p_created_by,
    CURRENT_DATE,
    jsonb_build_object(
      'workflow_id', p_workflow_id,
      'employee_id', p_employee_id,
      'employee_name', p_employee_name,
      'employee_position', p_employee_position,
      'employee_email', p_employee_email,
      'termination_type', p_termination_type,
      'grounds_for_cause', COALESCE(p_grounds_for_cause, ARRAY[]::TEXT[]),
      'termination_reason', p_termination_reason,
      'created_at', NOW()
    )
  )
  RETURNING id INTO v_resolution_id;
  
  -- Also create in board_resolutions for backward compatibility and exit_workflows foreign key
  INSERT INTO public.board_resolutions (
    resolution_number,
    resolution_type,
    subject_position,
    subject_person_name,
    subject_person_email,
    resolution_title,
    resolution_text,
    effective_date,
    status,
    created_by,
    board_members,
    votes_for,
    votes_against,
    votes_abstain,
    required_documents,
    notes
  ) VALUES (
    v_resolution_number,
    'removal',
    p_employee_position,
    p_employee_name,
    p_employee_email,
    v_resolution_title,
    v_resolution_description,
    CURRENT_DATE,
    'pending',
    p_created_by,
    '[]'::jsonb,
    0,
    0,
    0,
    '[]'::jsonb,
    json_build_object(
      'workflow_id', p_workflow_id,
      'employee_id', p_employee_id,
      'governance_resolution_id', v_resolution_id,
      'termination_type', p_termination_type,
      'grounds_for_cause', COALESCE(p_grounds_for_cause, ARRAY[]::TEXT[]),
      'reason', p_termination_reason,
      'created_at', NOW()
    )::TEXT
  );
  
  -- Link to workflow (use the board_resolutions id for the foreign key)
  UPDATE public.exit_workflows
  SET 
    board_resolution_id = (SELECT id FROM public.board_resolutions WHERE resolution_number = v_resolution_number LIMIT 1),
    updated_at = NOW()
  WHERE id = p_workflow_id;
  
  RETURN (SELECT id FROM public.board_resolutions WHERE resolution_number = v_resolution_number LIMIT 1);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create board resolution: %', SQLERRM;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.create_board_resolution_for_removal IS 
  'Creates a board resolution for executive removal in both governance_board_resolutions (for UI) and board_resolutions (for backward compatibility). Uses SECURITY DEFINER to bypass RLS.';

















































