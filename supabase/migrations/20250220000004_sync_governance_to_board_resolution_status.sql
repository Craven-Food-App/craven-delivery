-- Sync governance_board_resolutions status changes to board_resolutions
-- This ensures the exit workflow trigger fires when resolutions are adopted via voting

-- Function to sync status from governance_board_resolutions to board_resolutions
CREATE OR REPLACE FUNCTION public.sync_governance_resolution_status()
RETURNS TRIGGER AS $$
DECLARE
  v_board_resolution_id UUID;
BEGIN
  -- Only process if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Find corresponding board_resolutions record by resolution_number
  SELECT id INTO v_board_resolution_id
  FROM public.board_resolutions
  WHERE resolution_number = NEW.resolution_number
  LIMIT 1;

  -- If no corresponding board_resolutions record, nothing to sync
  IF v_board_resolution_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Map governance status to board_resolutions status
  -- governance: DRAFT, PENDING_VOTE, ADOPTED, REJECTED
  -- board_resolutions: pending, approved, rejected, executed
  IF NEW.status = 'ADOPTED' THEN
    UPDATE public.board_resolutions
    SET 
      status = 'approved',
      updated_at = now()
    WHERE id = v_board_resolution_id;
    
    RAISE NOTICE 'Synced governance resolution % status ADOPTED to board_resolutions % (approved)', 
      NEW.resolution_number, v_board_resolution_id;
      
  ELSIF NEW.status = 'REJECTED' THEN
    UPDATE public.board_resolutions
    SET 
      status = 'rejected',
      updated_at = now()
    WHERE id = v_board_resolution_id;
    
    RAISE NOTICE 'Synced governance resolution % status REJECTED to board_resolutions % (rejected)', 
      NEW.resolution_number, v_board_resolution_id;
      
  ELSIF NEW.status = 'PENDING_VOTE' THEN
    UPDATE public.board_resolutions
    SET 
      status = 'pending',
      updated_at = now()
    WHERE id = v_board_resolution_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on governance_board_resolutions table
DROP TRIGGER IF EXISTS trigger_sync_governance_resolution_status ON public.governance_board_resolutions;
CREATE TRIGGER trigger_sync_governance_resolution_status
  AFTER UPDATE OF status ON public.governance_board_resolutions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.sync_governance_resolution_status();

-- Add comment
COMMENT ON FUNCTION public.sync_governance_resolution_status() IS 
  'Syncs status changes from governance_board_resolutions to board_resolutions to trigger exit workflow updates';

-- One-time sync: Update board_resolutions status for any governance resolutions that are already ADOPTED
-- This handles resolutions that were adopted before the trigger was created
DO $$
DECLARE
  gov_res RECORD;
  br_id UUID;
  updated_count INTEGER := 0;
BEGIN
  -- Find all governance resolutions that are ADOPTED but board_resolutions are still pending
  FOR gov_res IN 
    SELECT 
      gbr.resolution_number,
      gbr.status as gov_status,
      gbr.id as gov_id
    FROM public.governance_board_resolutions gbr
    WHERE gbr.status = 'ADOPTED'
  LOOP
    -- Find corresponding board_resolutions record
    SELECT id INTO br_id
    FROM public.board_resolutions
    WHERE resolution_number = gov_res.resolution_number
    LIMIT 1;
    
    -- If found and status is still pending, update it
    IF br_id IS NOT NULL THEN
      UPDATE public.board_resolutions
      SET 
        status = 'approved',
        updated_at = now()
      WHERE id = br_id
        AND status = 'pending'; -- Only update if still pending
      
      IF FOUND THEN
        updated_count := updated_count + 1;
        RAISE NOTICE 'Synced resolution % from governance (ADOPTED) to board_resolutions (approved)', 
          gov_res.resolution_number;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'One-time sync completed: Updated % board_resolutions records', updated_count;
END $$;
