
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Authenticated can read delivery-photos'
  ) THEN
    CREATE POLICY "Authenticated can read delivery-photos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'delivery-photos');
  END IF;
END $$;
