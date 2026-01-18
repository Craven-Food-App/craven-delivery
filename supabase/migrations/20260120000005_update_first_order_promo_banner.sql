-- Update promotional banner to match new "$20 Crave'n Credit — Unlock Over First 3 Orders" promotion

-- The promotional_banners table uses 'subtitle' column (not 'description')
-- Update any existing banner with old "$10 off" or "FREE DELIVERY + $10" text
UPDATE public.promotional_banners
SET 
  title = '$20 OFF',
  subtitle = 'Your first 3 Crave''n Orders - Unlock $20 credit over your first 3 orders',
  updated_at = now()
WHERE 
  (title ILIKE '%FREE DELIVERY%$10%' OR title ILIKE '%$10%FREE%' OR title ILIKE '%FREE DELIVERY + $10%')
  OR (subtitle ILIKE '%first Crave%' AND (subtitle ILIKE '%FREE delivery%$10%' OR subtitle ILIKE '%$10 off%'))
  OR (title ILIKE '%FREE DELIVERY%' AND subtitle ILIKE '%$10%')
  OR (title ILIKE '%$10%' AND subtitle ILIKE '%first%');

-- If no banner with the new text exists and no banner was updated, insert a new one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.promotional_banners 
    WHERE title = '$20 OFF' 
    AND subtitle = 'Your first 3 Crave''n Orders - Unlock $20 credit over your first 3 orders'
  ) THEN
    -- Check if there are any active banners
    IF NOT EXISTS (SELECT 1 FROM public.promotional_banners WHERE is_active = true LIMIT 1) THEN
      INSERT INTO public.promotional_banners (title, subtitle, image_url, is_active, display_order)
      VALUES (
        '$20 OFF',
        'Your first 3 Crave''n Orders - Unlock $20 credit over your first 3 orders',
        '', -- image_url is required, use empty string or existing image
        true,
        1
      );
    END IF;
  END IF;
END $$;

