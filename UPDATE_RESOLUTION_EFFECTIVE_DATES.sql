-- UPDATE RESOLUTION EFFECTIVE DATES
-- Set effective_date to match meeting_date for executive appointment resolutions

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update all resolutions where effective_date doesn't match meeting_date
  -- and meeting_date is not null
  UPDATE governance_board_resolutions
  SET 
    effective_date = meeting_date,
    updated_at = NOW()
  WHERE meeting_date IS NOT NULL
    AND (effective_date IS NULL OR effective_date != meeting_date)
    AND type = 'EXECUTIVE_APPOINTMENT';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE 'Updated % resolutions to set effective_date = meeting_date', updated_count;

  -- Specifically update the three resolutions mentioned:
  -- 2025-0003: Justin Sweet as CFO (11/25/2025)
  -- 2025-0002: Nathan Curry as CTO (11/18/2025)
  -- 2025-0001: Torrance Stroman as CEO (11/16/2025)
  
  UPDATE governance_board_resolutions
  SET 
    effective_date = meeting_date,
    updated_at = NOW()
  WHERE resolution_number IN ('2025-0003', '2025-0002', '2025-0001')
    AND meeting_date IS NOT NULL
    AND (effective_date IS NULL OR effective_date != meeting_date);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'Updated % specific resolutions (2025-0001, 2025-0002, 2025-0003)', updated_count;
  END IF;

END $$;

-- Verify the updates
SELECT 
  resolution_number,
  title,
  meeting_date,
  effective_date,
  CASE 
    WHEN meeting_date = effective_date THEN 'MATCH'
    WHEN meeting_date IS NULL THEN 'NO MEETING DATE'
    WHEN effective_date IS NULL THEN 'NO EFFECTIVE DATE'
    ELSE 'MISMATCH'
  END AS date_status,
  status,
  type
FROM governance_board_resolutions
WHERE resolution_number IN ('2025-0003', '2025-0002', '2025-0001')
   OR (type = 'EXECUTIVE_APPOINTMENT' AND meeting_date IS NOT NULL)
ORDER BY resolution_number DESC;

