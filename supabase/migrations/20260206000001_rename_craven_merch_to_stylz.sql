-- ============================================================================
-- RENAME CRAVE'N MERCH → CRAVE'N STYLZ
-- Updates the store name and removes hardcoded stock images
-- ============================================================================

UPDATE public.restaurants
SET 
  name = 'Crave''n Stylz',
  image_url = NULL,
  header_image_url = NULL,
  updated_at = NOW()
WHERE name = 'Crave''n Merch';

-- Also update the owner profile name
UPDATE public.user_profiles
SET full_name = 'Crave''n Stylz Owner'
WHERE full_name = 'Crave''n Merch Owner';

-- Remove hardcoded stock images from all Crave'n Stylz menu items
UPDATE public.menu_items
SET image_url = NULL, updated_at = NOW()
WHERE restaurant_id = (
  SELECT id FROM public.restaurants WHERE name = 'Crave''n Stylz' LIMIT 1
)
AND image_url LIKE '%unsplash.com%';

