CREATE TABLE IF NOT EXISTS public.cx_courier_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  document_type text NOT NULL CHECK (document_type IN ('courier_insurance','dot_authority','business_license','w9')),
  file_url text NOT NULL,
  file_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  rejection_reason text,
  expires_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cx_courier_documents TO authenticated;
GRANT ALL ON public.cx_courier_documents TO service_role;

ALTER TABLE public.cx_courier_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cx_docs_owner_read"
  ON public.cx_courier_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = cx_courier_documents.restaurant_id
        AND r.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "cx_docs_owner_upload"
  ON public.cx_courier_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = cx_courier_documents.restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "cx_docs_admin_manage"
  ON public.cx_courier_documents FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cx_docs_owner_delete"
  ON public.cx_courier_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = cx_courier_documents.restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_cx_docs_restaurant ON public.cx_courier_documents(restaurant_id);

CREATE TRIGGER trg_cx_courier_documents_updated_at
  BEFORE UPDATE ON public.cx_courier_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- When an insurance doc is approved, flip the gate on restaurants.cx_insurance_approved.
CREATE OR REPLACE FUNCTION public.cx_courier_documents_sync_gate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.document_type = 'courier_insurance' AND NEW.status = 'approved' THEN
    UPDATE public.restaurants
      SET cx_insurance_approved = true
      WHERE id = NEW.restaurant_id;
  END IF;
  IF NEW.document_type = 'courier_insurance' AND NEW.status IN ('rejected','expired') THEN
    -- If no other approved & non-expired insurance exists, flip gate off.
    IF NOT EXISTS (
      SELECT 1 FROM public.cx_courier_documents
      WHERE restaurant_id = NEW.restaurant_id
        AND document_type = 'courier_insurance'
        AND status = 'approved'
        AND (expires_at IS NULL OR expires_at > now())
        AND id <> NEW.id
    ) THEN
      UPDATE public.restaurants
        SET cx_insurance_approved = false
        WHERE id = NEW.restaurant_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cx_docs_sync_gate ON public.cx_courier_documents;
CREATE TRIGGER trg_cx_docs_sync_gate
  AFTER INSERT OR UPDATE OF status ON public.cx_courier_documents
  FOR EACH ROW EXECUTE FUNCTION public.cx_courier_documents_sync_gate();