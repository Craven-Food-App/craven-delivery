-- ================================================
-- Invoice Email Processing Functions
-- ================================================
-- SQL functions to support email-to-invoice integration
-- ================================================

-- ================================================
-- 1. Generate Invoice Number
-- ================================================
-- Generates invoice number in format: INV-YYYY-XXXXXX
-- Where YYYY is the year and XXXXXX is a 6-digit sequence number
-- ================================================

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.invoices
  WHERE invoice_number LIKE 'INV-' || year_part || '-%';
  
  -- Return formatted invoice number: INV-YYYY-XXXXXX
  RETURN 'INV-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$;

-- ================================================
-- 2. Calculate Due Date
-- ================================================
-- Calculates due date based on invoice date and payment terms
-- Defaults to Net 30 if payment_terms is not provided
-- ================================================

CREATE OR REPLACE FUNCTION calculate_due_date(
  p_invoice_date DATE,
  p_payment_terms TEXT DEFAULT 'Net 30'
)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  days_to_add INTEGER;
BEGIN
  -- Parse payment terms to extract number of days
  IF p_payment_terms ILIKE 'Net %' THEN
    -- Extract number from "Net 30", "Net 15", etc.
    days_to_add := CAST(SUBSTRING(p_payment_terms FROM '[0-9]+') AS INTEGER);
  ELSIF p_payment_terms ILIKE 'Due on Receipt' OR p_payment_terms ILIKE 'Due on Receipt%' THEN
    days_to_add := 0;
  ELSE
    -- Default to Net 30
    days_to_add := 30;
  END IF;
  
  -- Return invoice date + days
  RETURN p_invoice_date + (days_to_add || ' days')::INTERVAL;
END;
$$;

-- ================================================
-- 3. Create Invoice from Email
-- ================================================
-- Creates an invoice record from email data
-- Automatically generates invoice number, calculates due date, and logs the email
-- Returns the created invoice record
-- ================================================

CREATE OR REPLACE FUNCTION create_invoice_from_email(
  p_vendor_name TEXT,
  p_vendor_email TEXT,
  p_invoice_date DATE DEFAULT CURRENT_DATE,
  p_due_date DATE DEFAULT NULL,
  p_amount NUMERIC DEFAULT 0,
  p_tax_amount NUMERIC DEFAULT 0,
  p_invoice_file_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_email_subject TEXT DEFAULT NULL,
  p_extracted_data JSONB DEFAULT '{}'::jsonb,
  p_payment_terms TEXT DEFAULT 'Net 30'
)
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
  vendor_name TEXT,
  vendor_email TEXT,
  invoice_date DATE,
  due_date DATE,
  amount NUMERIC,
  tax_amount NUMERIC,
  total_amount NUMERIC,
  status TEXT,
  invoice_file_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_number TEXT;
  v_due_date DATE;
  v_invoice_id UUID;
  v_notes TEXT;
BEGIN
  -- Generate invoice number
  v_invoice_number := generate_invoice_number();
  
  -- Calculate due date if not provided
  IF p_due_date IS NULL THEN
    v_due_date := calculate_due_date(p_invoice_date, p_payment_terms);
  ELSE
    v_due_date := p_due_date;
  END IF;
  
  -- Build notes field
  v_notes := COALESCE(p_notes, '');
  IF p_email_subject IS NOT NULL THEN
    IF v_notes != '' THEN
      v_notes := v_notes || E'\n';
    END IF;
    v_notes := v_notes || 'Received via email from ' || p_vendor_email || '. Subject: ' || p_email_subject;
  END IF;
  
  -- Insert invoice (total_amount is generated automatically, so we don't include it)
  INSERT INTO public.invoices (
    invoice_number,
    vendor_name,
    vendor_email,
    invoice_date,
    due_date,
    amount,
    tax_amount,
    status,
    invoice_file_url,
    notes,
    created_at,
    updated_at
  )
  VALUES (
    v_invoice_number,
    p_vendor_name,
    p_vendor_email,
    p_invoice_date,
    v_due_date,
    COALESCE(p_amount, 0),
    COALESCE(p_tax_amount, 0),
    'pending',
    p_invoice_file_url,
    v_notes,
    NOW(),
    NOW()
  )
  RETURNING invoices.id INTO v_invoice_id;
  
  -- Log email processing (if table exists)
  BEGIN
    INSERT INTO public.invoice_email_logs (
      invoice_id,
      email_from,
      email_subject,
      email_received_at,
      processing_status,
      extracted_data
    )
    VALUES (
      v_invoice_id,
      p_vendor_email,
      p_email_subject,
      NOW(),
      'processed',
      p_extracted_data
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Table might not exist yet, ignore error
      NULL;
  END;
  
  -- Return the created invoice
  RETURN QUERY
  SELECT 
    i.id,
    i.invoice_number,
    i.vendor_name,
    i.vendor_email,
    i.invoice_date,
    i.due_date,
    i.amount,
    i.tax_amount,
    i.total_amount,
    i.status,
    i.invoice_file_url,
    i.notes,
    i.created_at
  FROM public.invoices i
  WHERE i.id = v_invoice_id;
END;
$$;

-- ================================================
-- 4. Log Invoice Email Processing
-- ================================================
-- Logs email processing status (for manual logging if needed)
-- ================================================

CREATE OR REPLACE FUNCTION log_invoice_email(
  p_invoice_id UUID,
  p_email_from TEXT,
  p_email_subject TEXT DEFAULT NULL,
  p_processing_status TEXT DEFAULT 'processed',
  p_extracted_data JSONB DEFAULT '{}'::jsonb,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.invoice_email_logs (
    invoice_id,
    email_from,
    email_subject,
    email_received_at,
    processing_status,
    extracted_data,
    error_message,
    created_at,
    updated_at
  )
  VALUES (
    p_invoice_id,
    p_email_from,
    p_email_subject,
    NOW(),
    p_processing_status,
    p_extracted_data,
    p_error_message,
    NOW(),
    NOW()
  )
  RETURNING invoice_email_logs.id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- ================================================
-- 5. Get CFO Email
-- ================================================
-- Returns the email address of the CFO for notifications
-- ================================================

CREATE OR REPLACE FUNCTION get_cfo_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfo_email TEXT;
BEGIN
  SELECT up.email
  INTO v_cfo_email
  FROM public.exec_users eu
  INNER JOIN public.user_profiles up ON up.user_id = eu.user_id
  WHERE eu.role = 'cfo'
  LIMIT 1;
  
  RETURN v_cfo_email;
END;
$$;

-- ================================================
-- 6. Auto-generate Invoice Number Trigger
-- ================================================
-- Automatically generates invoice number if not provided on insert
-- ================================================

CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger (only if it doesn't exist)
DROP TRIGGER IF EXISTS trigger_set_invoice_number ON public.invoices;
CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- ================================================
-- 7. Auto-calculate Due Date Trigger
-- ================================================
-- Automatically calculates due date if not provided on insert
-- ================================================

CREATE OR REPLACE FUNCTION set_due_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_terms TEXT;
BEGIN
  -- Only calculate if due_date is not provided
  IF NEW.due_date IS NULL THEN
    -- Extract payment terms from notes if available
    IF NEW.notes IS NOT NULL AND NEW.notes ~* 'Payment Terms:\s*(.+)' THEN
      v_payment_terms := SUBSTRING(NEW.notes FROM 'Payment Terms:\s*(.+)');
    ELSE
      v_payment_terms := 'Net 30';
    END IF;
    
    NEW.due_date := calculate_due_date(NEW.invoice_date, v_payment_terms);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger (only if it doesn't exist)
DROP TRIGGER IF EXISTS trigger_set_due_date ON public.invoices;
CREATE TRIGGER trigger_set_due_date
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_due_date();

-- ================================================
-- Comments
-- ================================================

COMMENT ON FUNCTION generate_invoice_number() IS 'Generates a unique invoice number in format INV-YYYY-XXXXXX';
COMMENT ON FUNCTION calculate_due_date(DATE, TEXT) IS 'Calculates due date based on invoice date and payment terms (defaults to Net 30)';
COMMENT ON FUNCTION create_invoice_from_email(TEXT, TEXT, DATE, DATE, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, JSONB, TEXT) IS 'Creates an invoice from email data, automatically generates number, calculates due date, and logs the email';
COMMENT ON FUNCTION log_invoice_email(UUID, TEXT, TEXT, TEXT, JSONB, TEXT) IS 'Logs email processing status for an invoice';
COMMENT ON FUNCTION get_cfo_email() IS 'Returns the email address of the CFO for notifications';
COMMENT ON FUNCTION set_invoice_number() IS 'Trigger function to auto-generate invoice number on insert';
COMMENT ON FUNCTION set_due_date() IS 'Trigger function to auto-calculate due date on insert';

