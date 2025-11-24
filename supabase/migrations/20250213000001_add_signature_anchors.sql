-- Add signature_anchors column to executive_documents
-- This stores PDF coordinates for signature anchor points
ALTER TABLE public.executive_documents 
ADD COLUMN IF NOT EXISTS signature_anchors JSONB DEFAULT NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_executive_documents_signature_anchors 
ON public.executive_documents USING GIN (signature_anchors);

COMMENT ON COLUMN public.executive_documents.signature_anchors IS 
'JSONB map of signature anchor positions in PDF coordinates: {"CEO": {"page": 1, "x": 155, "y": 482}, "CFO": {"page": 1, "x": 200, "y": 482}, ...}. Coordinates are in PDF points (1/72 inch).';




