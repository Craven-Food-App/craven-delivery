-- Create a SECURITY DEFINER function to create board resolutions
-- This bypasses RLS and ensures board resolutions can always be created for exit workflows

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
  v_resolution_text TEXT;
BEGIN
  -- Generate resolution number
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(resolution_number FROM 5) AS INTEGER)), 0) + 1
  INTO v_count
  FROM public.board_resolutions
  WHERE resolution_number LIKE v_year || '-%';
  
  v_resolution_number := v_year || '-' || LPAD(v_count::TEXT, 4, '0');
  
  -- Prepare resolution text
  v_resolution_title := 'Removal of ' || p_employee_name || ' as ' || p_employee_position;
  
  IF p_termination_type = 'for_cause' THEN
    v_resolution_text := 'Resolution to remove ' || p_employee_name || 
      ' from the position of ' || p_employee_position || ' for cause. ' ||
      'Grounds: ' || COALESCE(array_to_string(p_grounds_for_cause, ', '), 'N/A') || '. ' ||
      'Reason: ' || COALESCE(p_termination_reason, 'N/A');
  ELSE
    v_resolution_text := 'Resolution to remove ' || p_employee_name || 
      ' from the position of ' || p_employee_position || ' without cause. ' ||
      'Reason: ' || COALESCE(p_termination_reason, 'N/A');
  END IF;
  
  -- Insert board resolution
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
    v_resolution_text,
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
      'termination_type', p_termination_type,
      'grounds_for_cause', COALESCE(p_grounds_for_cause, ARRAY[]::TEXT[]),
      'reason', p_termination_reason,
      'created_at', NOW()
    )::TEXT
  )
  RETURNING id INTO v_resolution_id;
  
  -- Link to workflow
  UPDATE public.exit_workflows
  SET 
    board_resolution_id = v_resolution_id,
    updated_at = NOW()
  WHERE id = p_workflow_id;
  
  RETURN v_resolution_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create board resolution: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_board_resolution_for_removal TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_board_resolution_for_removal IS 
  'Creates a board resolution for executive removal. Uses SECURITY DEFINER to bypass RLS.';













































