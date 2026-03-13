-- Ensure cap_tables never reports more issued shares than authorized
-- and never reports negative unissued shares.

UPDATE cap_tables
SET
  total_issued = LEAST(total_issued, total_authorized),
  total_unissued = GREATEST(total_authorized - LEAST(total_issued, total_authorized), 0),
  updated_at = NOW()
WHERE total_issued IS NOT NULL
  AND total_authorized IS NOT NULL;

-- Optional verification block
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, total_authorized, total_issued, total_unissued
    FROM cap_tables
  LOOP
    IF rec.total_issued > rec.total_authorized THEN
      RAISE EXCEPTION 'Cap table row % still has total_issued (% ) > total_authorized (%)', rec.id, rec.total_issued, rec.total_authorized;
    END IF;
    IF rec.total_unissued < 0 THEN
      RAISE EXCEPTION 'Cap table row % has negative total_unissued (%)', rec.id, rec.total_unissued;
    END IF;
  END LOOP;
END $$;

