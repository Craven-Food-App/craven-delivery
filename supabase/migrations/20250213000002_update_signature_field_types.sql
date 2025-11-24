-- Update the CHECK constraint on document_template_signature_fields.field_type
-- to include all field types used by DocumentTemplateTagger component

-- Drop the existing constraint
ALTER TABLE public.document_template_signature_fields 
DROP CONSTRAINT IF EXISTS document_template_signature_fields_field_type_check;

-- Add the updated constraint with all supported field types
ALTER TABLE public.document_template_signature_fields 
ADD CONSTRAINT document_template_signature_fields_field_type_check 
CHECK (field_type IN (
  'signature', 
  'initials', 
  'initial',  -- Allow both 'initial' and 'initials' for backward compatibility
  'date', 
  'text',
  'name',
  'email',
  'company',
  'title'
));

COMMENT ON COLUMN public.document_template_signature_fields.field_type IS 
'Type of signature field: signature, initials/initial, date, text, name, email, company, or title';




