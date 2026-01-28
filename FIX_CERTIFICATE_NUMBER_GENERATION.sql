-- FIX CERTIFICATE NUMBER GENERATION FUNCTION
-- The current function has a bug - it's looking for CERT-YYYYNNNNNN but the format is CERT-YYYY-NNNNNN
-- This fixes the function to properly generate unique certificate numbers

CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  year_part TEXT;
  max_num INTEGER;
BEGIN
  year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Find the maximum certificate number for the current year
  -- Format is CERT-YYYY-NNNNNN (e.g., CERT-2025-000001)
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(
        certificate_number 
        FROM ('CERT-' || year_part || '-(.+)$')
      ) AS INTEGER
    )
  ), 0)
  INTO max_num
  FROM public.share_certificates
  WHERE certificate_number ~ ('^CERT-' || year_part || '-[0-9]+$');
  
  -- If no certificates found for this year, start at 1, otherwise increment
  next_num := max_num + 1;
  
  RETURN 'CERT-' || year_part || '-' || LPAD(next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT generate_certificate_number() AS next_certificate_number;

-- Show existing certificates to verify
SELECT 
  certificate_number,
  recipient_user_id,
  shares_amount,
  issue_date
FROM share_certificates
ORDER BY certificate_number DESC
LIMIT 10;

