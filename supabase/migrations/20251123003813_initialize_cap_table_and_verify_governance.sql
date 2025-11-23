-- Initialize Cap Table for Fortune 500 Governance System
-- This ensures the cap table exists and is properly configured

-- Add company_name column if missing
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

-- Initialize cap table with Fortune 500 structure
-- Only insert if no cap table exists
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
  100000000, -- 100 million authorized shares (Fortune 500 scale)
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
