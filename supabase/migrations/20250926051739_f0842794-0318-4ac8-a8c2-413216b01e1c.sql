-- Ensure the feeder-documents bucket exists (it might already exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('delivery-photos', 'delivery-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for delivery photos
CREATE POLICY "Drivers can upload delivery photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'delivery-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Drivers can view their delivery photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'delivery-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all delivery photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'delivery-photos' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);