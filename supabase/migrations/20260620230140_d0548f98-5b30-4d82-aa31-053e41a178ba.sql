-- Extend driver_signatures with full ESIGN audit fields
ALTER TABLE public.driver_signatures
  ADD COLUMN IF NOT EXISTS consent_statement TEXT,
  ADD COLUMN IF NOT EXISTS document_text TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT;

-- Allow multiple signatures per (driver, agreement_type) by versioning - drop the unique constraint if any
DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='public.driver_signatures'::regclass
      AND contype='u'
  LOOP
    EXECUTE format('ALTER TABLE public.driver_signatures DROP CONSTRAINT %I', c);
  END LOOP;
END$$;

CREATE INDEX IF NOT EXISTS idx_driver_signatures_driver_type
  ON public.driver_signatures(driver_id, agreement_type, signed_at DESC);