-- Function to merge duplicate board resolutions
-- Merges BR-2025-XXXX resolutions into 2025-XXXX resolutions
-- Uses SECURITY DEFINER to bypass RLS policies

CREATE OR REPLACE FUNCTION public.merge_duplicate_resolutions(
  p_keep_resolution_number TEXT,
  p_delete_resolution_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_keep_board_id UUID;
  v_keep_gov_id UUID;
  v_delete_board_id UUID;
  v_delete_gov_id UUID;
  v_workflows_updated INTEGER := 0;
  v_board_deleted BOOLEAN := false;
  v_gov_deleted BOOLEAN := false;
  v_result JSONB;
BEGIN
  -- Find the resolution to keep in board_resolutions
  SELECT id INTO v_keep_board_id
  FROM public.board_resolutions
  WHERE resolution_number = p_keep_resolution_number
  LIMIT 1;

  -- Find the resolution to keep in governance_board_resolutions
  SELECT id INTO v_keep_gov_id
  FROM public.governance_board_resolutions
  WHERE resolution_number = p_keep_resolution_number
  LIMIT 1;

  -- Find the resolution to delete in board_resolutions
  SELECT id INTO v_delete_board_id
  FROM public.board_resolutions
  WHERE resolution_number = p_delete_resolution_number
  LIMIT 1;

  -- Find the resolution to delete in governance_board_resolutions
  SELECT id INTO v_delete_gov_id
  FROM public.governance_board_resolutions
  WHERE resolution_number = p_delete_resolution_number
  LIMIT 1;

  -- Update exit_workflows if needed
  IF v_delete_board_id IS NOT NULL AND v_keep_board_id IS NOT NULL THEN
    UPDATE public.exit_workflows
    SET board_resolution_id = v_keep_board_id,
        updated_at = NOW()
    WHERE board_resolution_id = v_delete_board_id;
    
    GET DIAGNOSTICS v_workflows_updated = ROW_COUNT;
  END IF;

  -- Delete from board_resolutions
  IF v_delete_board_id IS NOT NULL THEN
    DELETE FROM public.board_resolutions
    WHERE id = v_delete_board_id;
    v_board_deleted = true;
  END IF;

  -- Delete from governance_board_resolutions
  IF v_delete_gov_id IS NOT NULL THEN
    DELETE FROM public.governance_board_resolutions
    WHERE id = v_delete_gov_id;
    v_gov_deleted = true;
  END IF;

  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'keep_resolution_number', p_keep_resolution_number,
    'delete_resolution_number', p_delete_resolution_number,
    'workflows_updated', v_workflows_updated,
    'board_resolution_deleted', v_board_deleted,
    'governance_resolution_deleted', v_gov_deleted
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'keep_resolution_number', p_keep_resolution_number,
      'delete_resolution_number', p_delete_resolution_number
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.merge_duplicate_resolutions(TEXT, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.merge_duplicate_resolutions IS 'Merges duplicate board resolutions by transferring references and deleting duplicates. Uses SECURITY DEFINER to bypass RLS.';













