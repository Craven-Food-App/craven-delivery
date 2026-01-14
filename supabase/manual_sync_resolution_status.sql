-- Manual sync script: Update board_resolutions status for resolution 2026-0002
-- Run this in Supabase SQL Editor if the status is still showing as "pending"

-- First, check current status in both tables
SELECT 
  'governance_board_resolutions' as table_name,
  resolution_number,
  status,
  id
FROM public.governance_board_resolutions
WHERE resolution_number = '2026-0002';

SELECT 
  'board_resolutions' as table_name,
  resolution_number,
  status,
  id
FROM public.board_resolutions
WHERE resolution_number = '2026-0002';

-- Update board_resolutions status if governance resolution is ADOPTED
UPDATE public.board_resolutions br
SET 
  status = 'approved',
  updated_at = now()
WHERE br.resolution_number = '2026-0002'
  AND EXISTS (
    SELECT 1 
    FROM public.governance_board_resolutions gbr
    WHERE gbr.resolution_number = br.resolution_number
      AND gbr.status = 'ADOPTED'
  )
  AND br.status = 'pending'; -- Only update if still pending

-- Verify the update
SELECT 
  'After update' as check_type,
  br.resolution_number,
  br.status as board_resolution_status,
  gbr.status as governance_status
FROM public.board_resolutions br
LEFT JOIN public.governance_board_resolutions gbr ON gbr.resolution_number = br.resolution_number
WHERE br.resolution_number = '2026-0002';




















