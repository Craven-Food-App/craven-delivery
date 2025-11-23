-- Initialize Cap Table for Craven Food
-- This creates the default cap table structure for a Fortune 500 corporation

-- First, check if company_name column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cap_tables' 
    AND column_name = 'company_name'
  ) THEN
    ALTER TABLE public.cap_tables ADD COLUMN company_name TEXT;
  END IF;
END $$;

-- Insert default cap table if none exists
-- Using proper column names from the schema
INSERT INTO public.cap_tables (
  company_name,
  total_authorized_shares,
  par_value,
  total_issued_shares,
  total_unissued,
  equity_pool,
  trust_shares,
  founder_shares,
  trust_percentage,
  founder_percentage,
  pool_percentage,
  as_of_date
)
SELECT 
  'Craven Food',
  100000000, -- 100 million authorized shares
  0.0001, -- $0.0001 par value
  0, -- Initially no shares issued
  100000000, -- All shares unissued initially
  20000000, -- 20 million shares reserved for equity pool (20%)
  60000000, -- 60 million shares in trust (60%)
  20000000, -- 20 million shares for founders (20%)
  60.00, -- 60% trust
  20.00, -- 20% founders
  20.00, -- 20% equity pool
  CURRENT_DATE
WHERE NOT EXISTS (
  SELECT 1 FROM public.cap_tables LIMIT 1
);

-- Verify cap table was created
DO $$
DECLARE
  cap_table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cap_table_count FROM public.cap_tables;
  IF cap_table_count = 0 THEN
    RAISE EXCEPTION 'Failed to create cap table';
  ELSE
    RAISE NOTICE 'Cap table initialized successfully with % record(s)', cap_table_count;
  END IF;
END $$;

