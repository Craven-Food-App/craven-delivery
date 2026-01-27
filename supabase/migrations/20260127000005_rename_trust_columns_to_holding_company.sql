-- ==============================================================================
-- RENAME TRUST COLUMNS TO HOLDING COMPANY
-- ==============================================================================
-- "trust_shares" → "holding_company_shares"
-- "trust_percentage" → "holding_company_percentage"
-- NO MORE TRUST REFERENCES ANYWHERE
-- ==============================================================================

-- Rename cap_tables columns
ALTER TABLE public.cap_tables 
  RENAME COLUMN trust_shares TO holding_company_shares;

ALTER TABLE public.cap_tables 
  RENAME COLUMN trust_percentage TO holding_company_percentage;

-- Update column comments
COMMENT ON COLUMN public.cap_tables.holding_company_shares IS 
  'Shares held by Invero, Inc. (the holding company that owns Crave''n Inc.)';

COMMENT ON COLUMN public.cap_tables.holding_company_percentage IS 
  'Percentage held by Invero, Inc. (the holding company that owns Crave''n Inc.)';

-- Remove any references to "trust" in trusts table (rename to holding_companies if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'trusts'
  ) THEN
    -- Rename the table
    ALTER TABLE public.trusts RENAME TO holding_companies;
    
    RAISE NOTICE 'Renamed trusts table to holding_companies';
  END IF;
END $$;

RAISE NOTICE '✅ All "trust" references removed from database schema';

