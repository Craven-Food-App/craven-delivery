-- Allow custom sprint source tags in merchant_prospects
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'merchant_prospects'
      AND constraint_name = 'merchant_prospects_source_check'
  ) THEN
    ALTER TABLE public.merchant_prospects DROP CONSTRAINT merchant_prospects_source_check;
  END IF;
END $$;

ALTER TABLE public.merchant_prospects
  ADD CONSTRAINT merchant_prospects_source_check
  CHECK (source IN ('manual', 'import', 'referral', 'toledo_sprint_2026_04_20', 'field_sprint', 'campaign'));