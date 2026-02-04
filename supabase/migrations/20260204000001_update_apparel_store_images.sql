-- ============================================================================
-- UPDATE APPAREL STORE IMAGES
-- Regenerate all store logos and product images to be unique
-- Update Crave'n Merch items to have branded images
-- ============================================================================

DO $$
DECLARE
  crave_n_merch_id UUID;
  elite_couture_id UUID;
  sole_society_id UUID;
  athletic_edge_id UUID;
  winter_gear_id UUID;
  accessory_avenue_id UUID;
  thread_co_id UUID;
  style_studio_id UUID;
BEGIN
  -- Update Crave'n Merch store logo and header
  SELECT id INTO crave_n_merch_id FROM public.restaurants WHERE name = 'Crave''n Merch' LIMIT 1;
  IF crave_n_merch_id IS NOT NULL THEN
    UPDATE public.restaurants
    SET 
      image_url = 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&h=400&fit=crop',
      header_image_url = 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&h=600&fit=crop',
      updated_at = NOW()
    WHERE id = crave_n_merch_id;
    
    -- Update Crave'n Merch menu items with branded descriptions
    UPDATE public.menu_items
    SET 
      description = CASE 
        WHEN name LIKE '%Hoodie%' THEN description || ' with C logo'
        WHEN name LIKE '%T-Shirt%' OR name LIKE '%Tee%' THEN description || ' with C logo'
        WHEN name LIKE '%Hat%' THEN description || ' with C logo'
        WHEN name LIKE '%Decal%' OR name LIKE '%Sticker%' THEN description || ' with logo'
        WHEN name LIKE '%Key Chain%' OR name LIKE '%Mouse Pad%' OR name LIKE '%Puzzle%' THEN description || ' with logo'
        ELSE description
      END,
      updated_at = NOW()
    WHERE restaurant_id = crave_n_merch_id;
  END IF;

  -- Update Elite Couture store logo
  SELECT id INTO elite_couture_id FROM public.restaurants WHERE name = 'Elite Couture' LIMIT 1;
  IF elite_couture_id IS NOT NULL THEN
    UPDATE public.restaurants
    SET 
      image_url = 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400&h=400&fit=crop',
      header_image_url = 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=800&h=600&fit=crop',
      updated_at = NOW()
    WHERE id = elite_couture_id;
    
    -- Update Elite Couture menu items with unique images
    UPDATE public.menu_items
    SET image_url = CASE 
      WHEN name = 'Cashmere Coat' THEN 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400&h=400&fit=crop'
      WHEN name = 'Silk Scarf' THEN 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop'
      ELSE image_url
    END,
    updated_at = NOW()
    WHERE restaurant_id = elite_couture_id;
  END IF;

  -- Update Sole Society store logo (already unique)
  SELECT id INTO sole_society_id FROM public.restaurants WHERE name = 'Sole Society' LIMIT 1;
  IF sole_society_id IS NOT NULL THEN
    UPDATE public.menu_items
    SET image_url = CASE 
      WHEN name = 'Basketball Shoes' THEN 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=400&fit=crop'
      WHEN name = 'Casual Sneakers' THEN 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=400&fit=crop'
      WHEN name = 'Shoe Cleaner Kit' THEN 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop'
      WHEN name = 'Shoe Insoles' THEN 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop'
      ELSE image_url
    END,
    updated_at = NOW()
    WHERE restaurant_id = sole_society_id;
  END IF;

  -- Update Accessory Avenue menu items with unique images
  SELECT id INTO accessory_avenue_id FROM public.restaurants WHERE name = 'Accessory Avenue' LIMIT 1;
  IF accessory_avenue_id IS NOT NULL THEN
    UPDATE public.menu_items
    SET image_url = CASE 
      WHEN name = 'Silver Necklace' THEN 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop'
      WHEN name = 'Leather Wallet' THEN 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop'
      WHEN name = 'Gold Earrings' THEN 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop'
      WHEN name = 'Designer Backpack' THEN 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop'
      ELSE image_url
    END,
    updated_at = NOW()
    WHERE restaurant_id = accessory_avenue_id;
  END IF;

  -- Update Thread & Co. menu items with unique images
  SELECT id INTO thread_co_id FROM public.restaurants WHERE name = 'Thread & Co.' LIMIT 1;
  IF thread_co_id IS NOT NULL THEN
    UPDATE public.menu_items
    SET image_url = CASE 
      WHEN name = 'Streetwear Backpack' THEN 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop'
      ELSE image_url
    END,
    updated_at = NOW()
    WHERE restaurant_id = thread_co_id;
  END IF;

  -- Update Style Studio store logo
  SELECT id INTO style_studio_id FROM public.restaurants WHERE name = 'Style Studio' LIMIT 1;
  IF style_studio_id IS NOT NULL THEN
    UPDATE public.restaurants
    SET 
      image_url = 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop',
      header_image_url = 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=600&fit=crop',
      updated_at = NOW()
    WHERE id = style_studio_id;
    
    UPDATE public.menu_items
    SET image_url = CASE 
      WHEN name = 'Statement Necklace' THEN 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop'
      ELSE image_url
    END,
    updated_at = NOW()
    WHERE restaurant_id = style_studio_id;
  END IF;

END $$;



