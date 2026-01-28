-- FIX CAP TABLE TO CORRECT VALUES
-- Total Authorized: 70,000,000
-- Total Issued: 55,300,000
-- Unissued: 14,700,000
--   - Equity Pool (Micro-Equity): 1,400,000
--   - Equity Pool: 13,300,000

-- First, check if micro_equity_pool column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cap_tables' 
    AND column_name = 'micro_equity_pool'
  ) THEN
    ALTER TABLE public.cap_tables ADD COLUMN micro_equity_pool BIGINT DEFAULT 0;
    RAISE NOTICE 'Added micro_equity_pool column to cap_tables';
  END IF;
END $$;

-- Update cap table with correct values
UPDATE cap_tables
SET 
  total_issued = 55300000,  -- 55,300,000
  total_unissued = 14700000,  -- 14,700,000
  equity_pool = 13300000,  -- 13,300,000 (regular equity pool)
  micro_equity_pool = 1400000,  -- 1,400,000 (micro-equity pool)
  updated_at = NOW()
WHERE id = (SELECT id FROM cap_tables LIMIT 1);

-- Verify the update
SELECT 
  total_authorized,
  total_issued,
  total_unissued,
  equity_pool,
  micro_equity_pool,
  (equity_pool + COALESCE(micro_equity_pool, 0)) as total_pools,
  (total_unissued - (equity_pool + COALESCE(micro_equity_pool, 0))) as other_unissued,
  ROUND((total_issued::numeric / total_authorized::numeric * 100), 1) as issued_percentage,
  ROUND((total_unissued::numeric / total_authorized::numeric * 100), 1) as unissued_percentage
FROM cap_tables
LIMIT 1;

