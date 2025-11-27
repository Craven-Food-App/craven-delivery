-- Update cap table to correct shareholder distribution
-- Trust: 55M (55%), Founder: 18M (18%), Equity Pool: 14M (14%)
UPDATE public.cap_tables
SET 
  trust_shares = 55000000,
  trust_percentage = 55.00,
  founder_shares = 18000000,
  founder_percentage = 18.00,
  equity_pool = 14000000,
  pool_percentage = 14.00,
  total_issued = 73000000,  -- 55M + 18M
  total_unissued = 27000000, -- 14M equity pool + 13M unallocated
  updated_at = NOW()
WHERE id = (SELECT id FROM public.cap_tables LIMIT 1);