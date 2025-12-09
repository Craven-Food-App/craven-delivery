-- Create storage bucket for feeder application documents
INSERT INTO storage.buckets (id, name, public) VALUES ('feeder-documents', 'feeder-documents', false);

-- Create storage policies for feeder documents
CREATE POLICY "Anyone can upload feeder documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'feeder-documents');

CREATE POLICY "Admins can view all feeder documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'feeder-documents');

CREATE POLICY "Users can update their own feeder documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'feeder-documents');

-- Add missing columns to feeder_applications table
ALTER TABLE public.feeder_applications 
ADD COLUMN IF NOT EXISTS license_number text,
ADD COLUMN IF NOT EXISTS license_state text,
ADD COLUMN IF NOT EXISTS license_expiry date,
ADD COLUMN IF NOT EXISTS ssn_last_four text,
ADD COLUMN IF NOT EXISTS bank_account_type text,
ADD COLUMN IF NOT EXISTS routing_number text,
ADD COLUMN IF NOT EXISTS account_number_last_four text,
ADD COLUMN IF NOT EXISTS drivers_license_front text,
ADD COLUMN IF NOT EXISTS drivers_license_back text,
ADD COLUMN IF NOT EXISTS insurance_document text,
ADD COLUMN IF NOT EXISTS vehicle_registration text;