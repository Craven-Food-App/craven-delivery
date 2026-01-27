-- Update cap table to 70,000,000 authorized shares for foundational round
-- This adjusts from the initial 100M to better align with early-stage equity allocation

-- Update the cap table
UPDATE cap_tables
SET 
  total_authorized = 70000000,
  total_unissued = 70000000 - COALESCE(total_issued, 0),
  updated_at = NOW()
WHERE id = (SELECT id FROM cap_tables LIMIT 1);

-- Verify the update
DO $$
DECLARE
  cap_total_authorized BIGINT;
  cap_total_issued BIGINT;
  cap_total_unissued BIGINT;
BEGIN
  SELECT 
    total_authorized,
    total_issued,
    total_unissued
  INTO 
    cap_total_authorized,
    cap_total_issued,
    cap_total_unissued
  FROM cap_tables
  LIMIT 1;

  RAISE NOTICE 'Cap table updated to 70M shares:';
  RAISE NOTICE '  Total authorized: %', cap_total_authorized;
  RAISE NOTICE '  Total issued: %', cap_total_issued;
  RAISE NOTICE '  Total unissued: %', cap_total_unissued;

  IF cap_total_authorized != 70000000 THEN
    RAISE EXCEPTION 'Cap table update failed - total_authorized should be 70000000, got %', cap_total_authorized;
  END IF;
END $$;

