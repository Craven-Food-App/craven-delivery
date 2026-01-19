-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone authenticated can upload images to chat conversations
DROP POLICY IF EXISTS "Authenticated users can upload chat images" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'chat-images' AND 
  auth.role() = 'authenticated'
);

-- Policy: Anyone can view chat images (public read)
DROP POLICY IF EXISTS "Public read access for chat images" ON storage.objects;
CREATE POLICY "Public read access for chat images"
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-images');

-- Policy: Users can delete their own uploaded images
DROP POLICY IF EXISTS "Users can delete their chat images" ON storage.objects;
CREATE POLICY "Users can delete their chat images"
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'chat-images' AND 
  auth.role() = 'authenticated'
);

