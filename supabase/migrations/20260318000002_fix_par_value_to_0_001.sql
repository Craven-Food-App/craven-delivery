-- Fix par value / price_per_share from 0.0001 to 0.001 across the system

-- Update equity_ledger entries that have the old default
UPDATE public.equity_ledger
SET price_per_share = 0.001
WHERE price_per_share = 0.0001;

-- Update cap_tables par_value
UPDATE public.cap_tables
SET par_value = 0.001
WHERE par_value = 0.0001;

-- Update column default for equity_ledger
ALTER TABLE public.equity_ledger
  ALTER COLUMN price_per_share SET DEFAULT 0.001;
