-- ================================================
-- Link Vendors to Invoices and Purchase Orders
-- ================================================
-- This migration creates the proper foreign key relationships
-- and adds purchase_order_id to invoices for tracking PO-to-Invoice flow
-- ================================================

-- Add foreign key constraint for vendor_id in invoices
DO $$
BEGIN
  -- Check if foreign key already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'invoices' 
    AND constraint_name = 'invoices_vendor_id_fkey'
  ) THEN
    -- Add foreign key constraint
    ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_vendor_id_fkey
    FOREIGN KEY (vendor_id)
    REFERENCES public.partner_vendors(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add purchase_order_id to invoices for tracking PO-to-Invoice flow
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'purchase_order_id'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_invoices_purchase_order ON public.invoices(purchase_order_id);
  END IF;
END $$;

-- Add invoice_id to purchase_orders for reverse lookup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders' 
    AND column_name = 'invoice_id'
  ) THEN
    ALTER TABLE public.purchase_orders
    ADD COLUMN invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_purchase_orders_invoice ON public.purchase_orders(invoice_id);
  END IF;
END $$;

-- Add vendor address fields to partner_vendors if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'partner_vendors' 
    AND column_name = 'address'
  ) THEN
    ALTER TABLE public.partner_vendors
    ADD COLUMN address TEXT,
    ADD COLUMN city TEXT,
    ADD COLUMN state TEXT,
    ADD COLUMN zip_code TEXT,
    ADD COLUMN country TEXT DEFAULT 'USA',
    ADD COLUMN tax_id TEXT,
    ADD COLUMN payment_terms TEXT DEFAULT 'Net 30',
    ADD COLUMN default_currency TEXT DEFAULT 'USD';
  END IF;
END $$;

-- Create function to auto-populate vendor info when vendor_id is set
CREATE OR REPLACE FUNCTION sync_invoice_vendor_info()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vendor_id IS NOT NULL AND (OLD.vendor_id IS NULL OR OLD.vendor_id != NEW.vendor_id) THEN
    SELECT 
      vendor_name,
      contact_email,
      address
    INTO 
      NEW.vendor_name,
      NEW.vendor_email,
      NEW.vendor_address
    FROM public.partner_vendors
    WHERE id = NEW.vendor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-sync vendor info
DROP TRIGGER IF EXISTS trigger_sync_invoice_vendor_info ON public.invoices;
CREATE TRIGGER trigger_sync_invoice_vendor_info
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION sync_invoice_vendor_info();

-- Add comment
COMMENT ON COLUMN public.invoices.vendor_id IS 'References partner_vendors table. When set, vendor_name and vendor_email are auto-populated.';
COMMENT ON COLUMN public.invoices.purchase_order_id IS 'Links invoice to originating purchase order for complete procurement tracking.';



