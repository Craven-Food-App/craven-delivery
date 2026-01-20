-- Backfill governance_board_resolutions for existing board_resolutions
-- This ensures all board_resolutions have a corresponding governance_board_resolutions record
-- so that voting works correctly (board_resolution_votes references governance_board_resolutions.id)

DO $$
DECLARE
  br_record RECORD;
  gov_res_id UUID;
  notes_json JSONB;
BEGIN
  -- Loop through all board_resolutions that don't have a corresponding governance_board_resolutions record
  FOR br_record IN 
    SELECT 
      br.id,
      br.resolution_number,
      br.resolution_title,
      br.resolution_text,
      br.resolution_type,
      br.subject_position,
      br.subject_person_name,
      br.subject_person_email,
      br.effective_date,
      br.status,
      br.created_by,
      br.notes,
      br.created_at,
      br.updated_at
    FROM public.board_resolutions br
    WHERE NOT EXISTS (
      SELECT 1 
      FROM public.governance_board_resolutions gbr
      WHERE gbr.resolution_number = br.resolution_number
    )
  LOOP
    -- Check if notes contains governance_resolution_id
    gov_res_id := NULL;
    IF br_record.notes IS NOT NULL THEN
      BEGIN
        notes_json := CASE 
          WHEN jsonb_typeof(br_record.notes::jsonb) IS NOT NULL 
          THEN br_record.notes::jsonb
          ELSE jsonb_build_object()
        END;
        
        IF notes_json ? 'governance_resolution_id' THEN
          gov_res_id := (notes_json->>'governance_resolution_id')::UUID;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          -- If notes is not valid JSON, try parsing as text
          BEGIN
            notes_json := br_record.notes::jsonb;
            IF notes_json ? 'governance_resolution_id' THEN
              gov_res_id := (notes_json->>'governance_resolution_id')::UUID;
            END IF;
          EXCEPTION
            WHEN OTHERS THEN
              -- Notes is not JSON, skip
              NULL;
          END;
      END;
    END IF;
    
    -- If governance_resolution_id exists in notes, verify it exists
    IF gov_res_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.governance_board_resolutions WHERE id = gov_res_id) THEN
        gov_res_id := NULL; -- Invalid ID, reset
      END IF;
    END IF;
    
    -- If no valid governance resolution found, create one
    IF gov_res_id IS NULL THEN
      -- Map status from board_resolutions to governance_board_resolutions
      DECLARE
        gov_status TEXT;
        gov_type TEXT;
      BEGIN
        -- Map status
        gov_status := CASE br_record.status
          WHEN 'pending' THEN 'PENDING_VOTE'
          WHEN 'approved' THEN 'ADOPTED'
          WHEN 'rejected' THEN 'REJECTED'
          WHEN 'executed' THEN 'ADOPTED'
          ELSE 'DRAFT'
        END;
        
        -- Map type
        gov_type := CASE br_record.resolution_type
          WHEN 'removal' THEN 'EXECUTIVE_REMOVAL'
          WHEN 'appointment' THEN 'EXECUTIVE_APPOINTMENT'
          WHEN 'equity_grant' THEN 'EQUITY_GRANT'
          WHEN 'policy_change' THEN 'POLICY_CHANGE'
          ELSE 'OTHER'
        END;
        
        -- Create governance resolution
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
          br_record.resolution_number,
          br_record.resolution_title,
          br_record.resolution_text,
          gov_type,
          gov_status,
          br_record.created_by,
          br_record.effective_date,
          jsonb_build_object(
            'board_resolution_id', br_record.id,
            'backfilled', true,
            'backfilled_at', NOW()
          )
        )
        RETURNING id INTO gov_res_id;
        
        -- Update board_resolutions.notes to include governance_resolution_id
        UPDATE public.board_resolutions
        SET notes = jsonb_build_object(
          'governance_resolution_id', gov_res_id,
          'backfilled', true,
          'backfilled_at', NOW()
        )::TEXT
        WHERE id = br_record.id;
        
        RAISE NOTICE 'Created governance resolution % for board resolution % (%)', 
          gov_res_id, br_record.resolution_number, br_record.id;
      END;
    ELSE
      RAISE NOTICE 'Governance resolution % already exists for board resolution % (%)', 
        gov_res_id, br_record.resolution_number, br_record.id;
    END IF;
  END LOOP;
END $$;

-- Verify all board_resolutions have corresponding governance resolutions
SELECT 
  br.resolution_number,
  br.id as board_resolution_id,
  gbr.id as governance_resolution_id,
  CASE WHEN gbr.id IS NULL THEN 'MISSING' ELSE 'OK' END as status
FROM public.board_resolutions br
LEFT JOIN public.governance_board_resolutions gbr ON gbr.resolution_number = br.resolution_number
ORDER BY br.created_at DESC;












































