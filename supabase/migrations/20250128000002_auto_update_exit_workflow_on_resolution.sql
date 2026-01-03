-- Auto-update exit workflow when board resolution status changes
-- This ensures seamless workflow progression after board approval

-- Function to update exit workflow when board resolution is adopted/rejected
CREATE OR REPLACE FUNCTION public.update_exit_workflow_on_resolution_change()
RETURNS TRIGGER AS $$
DECLARE
  v_workflow_id UUID;
  v_employee_id UUID;
  v_employee_name TEXT;
BEGIN
  -- Only process if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Find exit workflow linked to this resolution
  SELECT id, employee_id INTO v_workflow_id, v_employee_id
  FROM public.exit_workflows
  WHERE board_resolution_id = NEW.id
  LIMIT 1;

  -- If no workflow found, nothing to do
  IF v_workflow_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get employee name for logging
  SELECT CONCAT(first_name, ' ', last_name) INTO v_employee_name
  FROM public.employees
  WHERE id = v_employee_id;

  -- Update workflow based on resolution status
  -- Handle both 'approved'/'executed' (board_resolutions) and 'ADOPTED' (if using governance_board_resolutions)
  IF UPPER(NEW.status) IN ('APPROVED', 'ADOPTED', 'EXECUTED') OR NEW.status IN ('approved', 'executed') THEN
    -- Board approved - update workflow status and mark board_approval step as completed
    UPDATE public.exit_workflows
    SET 
      status = 'board_approved',
      updated_at = now()
    WHERE id = v_workflow_id;

    -- Mark board_approval step as completed
    UPDATE public.exit_workflow_steps
    SET 
      status = 'completed',
      completed_at = now(),
      completed_by = NEW.executed_by,
      notes = 'Board resolution adopted'
    WHERE workflow_id = v_workflow_id 
      AND step_name = 'board_approval';

    -- Log the status change
    INSERT INTO public.governance_logs (
      action,
      actor_id,
      entity_type,
      entity_id,
      description,
      data
    ) VALUES (
      'EXIT_WORKFLOW_BOARD_APPROVED',
      NEW.executed_by,
      'EXIT_WORKFLOW',
      v_workflow_id,
      format('Board approved removal of %s. Workflow status updated to board_approved.', v_employee_name),
      jsonb_build_object(
        'workflow_id', v_workflow_id,
        'employee_id', v_employee_id,
        'employee_name', v_employee_name,
        'resolution_id', NEW.id,
        'resolution_number', NEW.resolution_number,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );

  ELSIF UPPER(NEW.status) = 'REJECTED' THEN
    -- Board rejected - update workflow status
    UPDATE public.exit_workflows
    SET 
      status = 'board_rejected',
      updated_at = now()
    WHERE id = v_workflow_id;

    -- Mark board_approval step as failed
    UPDATE public.exit_workflow_steps
    SET 
      status = 'failed',
      completed_at = now(),
      completed_by = NEW.executed_by,
      notes = 'Board resolution rejected'
    WHERE workflow_id = v_workflow_id 
      AND step_name = 'board_approval';

    -- Log the rejection
    INSERT INTO public.governance_logs (
      action,
      actor_id,
      entity_type,
      entity_id,
      description,
      data
    ) VALUES (
      'EXIT_WORKFLOW_BOARD_REJECTED',
      NEW.executed_by,
      'EXIT_WORKFLOW',
      v_workflow_id,
      format('Board rejected removal of %s. Workflow status updated to board_rejected.', v_employee_name),
      jsonb_build_object(
        'workflow_id', v_workflow_id,
        'employee_id', v_employee_id,
        'employee_name', v_employee_name,
        'resolution_id', NEW.id,
        'resolution_number', NEW.resolution_number,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on board_resolutions table
DROP TRIGGER IF EXISTS trigger_update_exit_workflow_on_resolution_change ON public.board_resolutions;
CREATE TRIGGER trigger_update_exit_workflow_on_resolution_change
  AFTER UPDATE OF status ON public.board_resolutions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.update_exit_workflow_on_resolution_change();

-- Add comment
COMMENT ON FUNCTION public.update_exit_workflow_on_resolution_change() IS 
  'Automatically updates exit workflow status when linked board resolution is adopted or rejected';

